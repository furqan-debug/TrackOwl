-- =============================================================================
-- Migration: 20261002000001_fix_block_duration_rounding.sql
-- 
-- Fixes the 8-minute discrepancy between real tracked wall-clock time
-- and admin portal pages (Timesheets, Reports, Dashboard, Screenshots).
--
-- Root Cause:
-- During tracking, loop execution delays cause each 10-minute block to span
-- ~605-640 seconds of real wall-clock time.
-- The previous SQL cap of LEAST(..., 600) was truncating each normal block
-- to exactly 600s, discarding 10-30s of actual user work per block.
-- Over 48 blocks (8 hours of continuous work), this truncation discarded
-- ~494 seconds (8 minutes), showing 7h 53m instead of 8h 1m.
--
-- Solution:
-- Set the per-block cap to 720 seconds (12 minutes).
-- This gives 100% credit for actual worked seconds during normal blocks
-- (including loop delays), while still strictly protecting against sleep/gap
-- inflation (> 12 minutes).
-- =============================================================================

-- 1. Fix get_sessions_activity_stats
CREATE OR REPLACE FUNCTION public.get_sessions_activity_stats(
  p_session_ids text[]
)
RETURNS TABLE (
  session_id uuid,
  duration_mins numeric,
  sample_count bigint,
  activity_sum numeric,
  activity_percent numeric,
  last_sample_at timestamptz,
  offline_count bigint,
  active_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  WITH requested_sessions AS (
    SELECT DISTINCT unnest(p_session_ids::uuid[]) AS sess_id
  ),
  -- 1. Aggregate from block_records (the single source of truth)
  block_stats AS (
    SELECT
      br.session_id AS b_session_id,
      COALESCE(ROUND(SUM(LEAST(EXTRACT(EPOCH FROM (br.block_end - br.block_start)), 720)) FILTER (WHERE br.credited = true) / 60), 0)::numeric AS duration_mins,
      COUNT(*) FILTER (WHERE br.credited = true)::bigint                                  AS sample_count,
      COALESCE(SUM(br.activity_percent) FILTER (WHERE br.credited = true), 0)::numeric     AS activity_sum,
      COALESCE(AVG(br.activity_percent) FILTER (WHERE br.credited = true), 0)::numeric     AS activity_percent,
      MAX(br.block_end)                                                                   AS last_sample_at,
      COUNT(*) FILTER (WHERE br.is_offline = true)::bigint                                AS offline_count,
      COUNT(*) FILTER (WHERE br.credited = true AND br.activity_percent > 0)::bigint      AS active_count
    FROM public.block_records br
    WHERE br.session_id = ANY(p_session_ids::uuid[])
    GROUP BY br.session_id
  ),
  -- 2. Fallback to activity_samples for brand-new live sessions (< 10 mins) with no blocks yet
  sample_stats AS (
    SELECT
      a.session_id AS s_session_id,
      COUNT(DISTINCT date_trunc('minute', a.recorded_at))::numeric                        AS duration_mins,
      COUNT(DISTINCT date_trunc('minute', a.recorded_at))::bigint                         AS sample_count,
      COALESCE(SUM(a.activity_percent), 0)::numeric                                       AS activity_sum,
      COALESCE(AVG(a.activity_percent), 0)::numeric                                       AS activity_percent,
      MAX(a.recorded_at)                                                                  AS last_sample_at,
      COUNT(*) FILTER (WHERE a.is_offline = true)::bigint                                 AS offline_count,
      COUNT(*) FILTER (WHERE a.activity_percent > 0)::bigint                              AS active_count
    FROM public.activity_samples a
    WHERE a.session_id = ANY(p_session_ids::uuid[])
    GROUP BY a.session_id
  )
  SELECT
    r.sess_id AS session_id,
    COALESCE(b.duration_mins, s.duration_mins, 0)         AS duration_mins,
    COALESCE(b.sample_count, s.sample_count, 0)           AS sample_count,
    COALESCE(b.activity_sum, s.activity_sum, 0)           AS activity_sum,
    COALESCE(b.activity_percent, s.activity_percent, 0)   AS activity_percent,
    COALESCE(b.last_sample_at, s.last_sample_at)          AS last_sample_at,
    COALESCE(b.offline_count, s.offline_count, 0)         AS offline_count,
    COALESCE(b.active_count, s.active_count, 0)           AS active_count
  FROM requested_sessions r
  LEFT JOIN block_stats b ON r.sess_id = b.b_session_id
  LEFT JOIN sample_stats s ON r.sess_id = s.s_session_id;
$function$;

-- 2. Fix get_reports_aggregated_data
CREATE OR REPLACE FUNCTION public.get_reports_aggregated_data(
  p_org_id     uuid,
  p_start_iso  timestamptz,
  p_end_iso    timestamptz,
  p_org_tz     text,
  p_member_ids text[] DEFAULT NULL
)
RETURNS jsonb
SECURITY DEFINER
VOLATILE
LANGUAGE plpgsql AS $$
DECLARE
  v_daily      jsonb;
  v_user_daily jsonb;
  v_apps       jsonb;
BEGIN
  -- Daily totals (org-wide) from block_records (clamped to 720s max per block)
  SELECT jsonb_agg(row_to_json(t)) INTO v_daily
  FROM (
    SELECT
      business_date::text AS date,
      COALESCE(ROUND(SUM(LEAST(EXTRACT(EPOCH FROM (block_end - block_start)), 720)) FILTER (WHERE credited = true) / 60), 0)::bigint AS total_minutes,
      COALESCE(SUM(activity_percent) FILTER (WHERE credited = true), 0)::numeric AS activity_sum,
      COUNT(*) FILTER (WHERE credited = true) AS sample_count
    FROM public.block_records
    WHERE organization_id = p_org_id
      AND block_start >= p_start_iso
      AND block_end   <= p_end_iso
      AND (p_member_ids IS NULL OR user_id = ANY(p_member_ids::uuid[]))
    GROUP BY business_date
    ORDER BY business_date ASC
  ) t;

  -- Per-user daily totals from block_records (clamped to 720s max per block)
  SELECT jsonb_agg(row_to_json(t)) INTO v_user_daily
  FROM (
    SELECT
      user_id,
      business_date::text AS date,
      COALESCE(ROUND(SUM(LEAST(EXTRACT(EPOCH FROM (block_end - block_start)), 720)) FILTER (WHERE credited = true) / 60), 0)::bigint AS total_minutes,
      COALESCE(SUM(activity_percent) FILTER (WHERE credited = true), 0)::numeric AS activity_sum,
      COUNT(*) FILTER (WHERE credited = true) AS sample_count
    FROM public.block_records
    WHERE organization_id = p_org_id
      AND block_start >= p_start_iso
      AND block_end   <= p_end_iso
      AND (p_member_ids IS NULL OR user_id = ANY(p_member_ids::uuid[]))
    GROUP BY user_id, business_date
  ) t;

  -- App usage totals from block_records (clamped to 720s max per block)
  SELECT jsonb_agg(row_to_json(t)) INTO v_apps
  FROM (
    SELECT
      app_name,
      COALESCE(ROUND(SUM(LEAST(EXTRACT(EPOCH FROM (block_end - block_start)), 720)) / 60), 0)::bigint AS total_minutes,
      AVG(activity_percent) AS activity_sum
    FROM public.block_records
    WHERE organization_id = p_org_id
      AND block_start >= p_start_iso
      AND block_end   <= p_end_iso
      AND credited = true
      AND app_name IS NOT NULL AND TRIM(app_name) != ''
      AND (p_member_ids IS NULL OR user_id = ANY(p_member_ids::uuid[]))
    GROUP BY app_name
    ORDER BY COUNT(*) DESC
  ) t;

  -- Fallback: if no block_records exist yet for the range, read from activity_samples
  IF v_daily IS NULL THEN
    CREATE TEMP TABLE _sample_activity ON COMMIT DROP AS
    SELECT DISTINCT ON (s.user_id, date_trunc('minute', a.recorded_at))
      a.activity_percent, a.app_name, s.user_id,
      TO_CHAR(a.recorded_at AT TIME ZONE p_org_tz, 'YYYY-MM-DD') AS day_str
    FROM activity_samples a
    JOIN sessions s ON a.session_id = s.id
    WHERE (a.organization_id = p_org_id OR s.organization_id = p_org_id)
      AND a.recorded_at >= p_start_iso AND a.recorded_at <= p_end_iso
      AND (p_member_ids IS NULL OR s.user_id = ANY(p_member_ids::uuid[]))
    ORDER BY s.user_id, date_trunc('minute', a.recorded_at), a.activity_percent DESC;

    SELECT jsonb_agg(row_to_json(t)) INTO v_daily FROM (
      SELECT day_str AS date, COUNT(*) AS total_minutes, SUM(activity_percent)::numeric AS activity_sum, COUNT(*) AS sample_count
      FROM _sample_activity GROUP BY day_str ORDER BY day_str
    ) t;

    SELECT jsonb_agg(row_to_json(t)) INTO v_user_daily FROM (
      SELECT user_id, day_str AS date, COUNT(*) AS total_minutes, SUM(activity_percent)::numeric AS activity_sum, COUNT(*) AS sample_count
      FROM _sample_activity GROUP BY user_id, day_str
    ) t;

    SELECT jsonb_agg(row_to_json(t)) INTO v_apps FROM (
      SELECT app_name, COUNT(*) AS total_minutes, SUM(activity_percent) AS activity_sum
      FROM _sample_activity WHERE app_name IS NOT NULL AND TRIM(app_name) != ''
      GROUP BY app_name ORDER BY COUNT(*) DESC
    ) t;
  END IF;

  RETURN jsonb_build_object(
    'daily_stats',      COALESCE(v_daily,      '[]'::jsonb),
    'user_daily_stats', COALESCE(v_user_daily, '[]'::jsonb),
    'app_stats',        COALESCE(v_apps,       '[]'::jsonb)
  );
END;
$$;

-- 3. Fix get_dashboard_metrics
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(
  p_org_id uuid,
  p_start_iso timestamptz,
  p_end_iso timestamptz,
  p_prev_start_iso timestamptz,
  p_prev_end_iso timestamptz,
  p_member_ids text[] DEFAULT NULL,
  p_project_ids text[] DEFAULT NULL
)
RETURNS jsonb
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_total_mins int := 0;
  v_activity_sum bigint := 0;
  v_activity_count int := 0;
  v_prev_total_mins int := 0;
  v_prev_activity_sum bigint := 0;
  v_prev_activity_count int := 0;
  
  v_app_usage jsonb;
  v_proj_stats jsonb;
  v_user_stats jsonb;
  v_user_screenshots jsonb;
  v_daily_stats jsonb;
  v_screenshot_count int := 0;
  v_projects_worked int := 0;
  v_active_members int := 0;
  v_has_blocks boolean := false;
BEGIN
  -- Check if block_records exist for this period
  SELECT EXISTS (
    SELECT 1 FROM public.block_records br
    WHERE br.organization_id = p_org_id
      AND br.block_start >= p_start_iso
      AND br.block_end <= p_end_iso
  ) INTO v_has_blocks;

  -- 1. Total screenshot count
  SELECT COUNT(*)
  INTO v_screenshot_count
  FROM screenshots ss
  JOIN sessions s ON ss.session_id = s.id
  WHERE ss.organization_id = p_org_id
    AND ss.recorded_at >= p_start_iso 
    AND ss.recorded_at <= p_end_iso
    AND (
      (p_member_ids IS NULL AND p_project_ids IS NULL)
      OR (p_member_ids IS NOT NULL AND s.user_id = ANY(p_member_ids::uuid[]))
      OR (p_project_ids IS NOT NULL AND s.project_id = ANY(p_project_ids))
    );

  IF v_has_blocks THEN
    -- Read from block_records (clamped to 720s max per block)
    SELECT 
      COALESCE(ROUND(SUM(LEAST(EXTRACT(EPOCH FROM (br.block_end - br.block_start)), 720)) FILTER (WHERE br.credited = true) / 60), 0)::int,
      COALESCE(SUM(br.activity_percent) FILTER (WHERE br.credited = true), 0)::bigint,
      COALESCE(COUNT(*) FILTER (WHERE br.credited = true), 0)::int,
      COUNT(DISTINCT s.project_id),
      COUNT(DISTINCT br.user_id)
    INTO 
      v_total_mins, 
      v_activity_sum,
      v_activity_count,
      v_projects_worked,
      v_active_members
    FROM public.block_records br
    LEFT JOIN sessions s ON br.session_id = s.id
    WHERE br.organization_id = p_org_id
      AND br.block_start >= p_start_iso 
      AND br.block_end <= p_end_iso
      AND (
        (p_member_ids IS NULL AND p_project_ids IS NULL)
        OR (p_member_ids IS NOT NULL AND br.user_id = ANY(p_member_ids::uuid[]))
        OR (p_project_ids IS NOT NULL AND s.project_id = ANY(p_project_ids))
      );

    -- Prev period from block_records (clamped to 720s)
    SELECT 
      COALESCE(ROUND(SUM(LEAST(EXTRACT(EPOCH FROM (br.block_end - br.block_start)), 720)) FILTER (WHERE br.credited = true) / 60), 0)::int,
      COALESCE(SUM(br.activity_percent) FILTER (WHERE br.credited = true), 0)::bigint,
      COALESCE(COUNT(*) FILTER (WHERE br.credited = true), 0)::int
    INTO 
      v_prev_total_mins, 
      v_prev_activity_sum,
      v_prev_activity_count
    FROM public.block_records br
    LEFT JOIN sessions s ON br.session_id = s.id
    WHERE br.organization_id = p_org_id
      AND br.block_start >= p_prev_start_iso 
      AND br.block_end <= p_prev_end_iso
      AND (
        (p_member_ids IS NULL AND p_project_ids IS NULL)
        OR (p_member_ids IS NOT NULL AND br.user_id = ANY(p_member_ids::uuid[]))
        OR (p_project_ids IS NOT NULL AND s.project_id = ANY(p_project_ids))
      );

    -- Top Apps usage from block_records
    SELECT jsonb_object_agg(COALESCE(app_name, 'Unknown'), cnt)
    INTO v_app_usage
    FROM (
      SELECT br.app_name, COUNT(*) as cnt
      FROM public.block_records br
      LEFT JOIN sessions s ON br.session_id = s.id
      WHERE br.organization_id = p_org_id
        AND br.block_start >= p_start_iso 
        AND br.block_end <= p_end_iso
        AND br.credited = true
        AND br.app_name IS NOT NULL
        AND TRIM(br.app_name) != ''
        AND LOWER(br.app_name) != 'program manager'
        AND (
          (p_member_ids IS NULL AND p_project_ids IS NULL)
          OR (p_member_ids IS NOT NULL AND br.user_id = ANY(p_member_ids::uuid[]))
          OR (p_project_ids IS NOT NULL AND s.project_id = ANY(p_project_ids))
        )
      GROUP BY br.app_name
      ORDER BY cnt DESC
      LIMIT 20
    ) t;

    -- User stats from block_records (clamped to 720s)
    SELECT COALESCE(jsonb_object_agg(user_id::text, json_build_object('mins', mins, 'activity_sum', act_sum, 'cnt', cnt)), '{}'::jsonb)
    INTO v_user_stats
    FROM (
      SELECT 
        br.user_id, 
        COALESCE(ROUND(SUM(LEAST(EXTRACT(EPOCH FROM (br.block_end - br.block_start)), 720)) FILTER (WHERE br.credited = true) / 60), 0)::int as mins, 
        COALESCE(SUM(br.activity_percent) FILTER (WHERE br.credited = true), 0) as act_sum,
        COUNT(*) FILTER (WHERE br.credited = true) as cnt
      FROM public.block_records br
      LEFT JOIN sessions s ON br.session_id = s.id
      WHERE br.organization_id = p_org_id
        AND br.block_start >= p_start_iso 
        AND br.block_end <= p_end_iso
        AND (
          (p_member_ids IS NULL AND p_project_ids IS NULL)
          OR (p_member_ids IS NOT NULL AND br.user_id = ANY(p_member_ids::uuid[]))
          OR (p_project_ids IS NOT NULL AND s.project_id = ANY(p_project_ids))
        )
      GROUP BY br.user_id
    ) t;

    -- Project stats from block_records (clamped to 720s)
    SELECT COALESCE(jsonb_object_agg(project_id::text, json_build_object('mins', mins, 'activity_sum', act_sum, 'cnt', cnt)), '{}'::jsonb)
    INTO v_proj_stats
    FROM (
      SELECT 
        s.project_id, 
        COALESCE(ROUND(SUM(LEAST(EXTRACT(EPOCH FROM (br.block_end - br.block_start)), 720)) FILTER (WHERE br.credited = true) / 60), 0)::int as mins, 
        COALESCE(SUM(br.activity_percent) FILTER (WHERE br.credited = true), 0) as act_sum,
        COUNT(*) FILTER (WHERE br.credited = true) as cnt
      FROM public.block_records br
      JOIN sessions s ON br.session_id = s.id
      WHERE br.organization_id = p_org_id
        AND br.block_start >= p_start_iso 
        AND br.block_end <= p_end_iso
        AND s.project_id IS NOT NULL
        AND (
          (p_member_ids IS NULL AND p_project_ids IS NULL)
          OR (p_member_ids IS NOT NULL AND br.user_id = ANY(p_member_ids::uuid[]))
          OR (p_project_ids IS NOT NULL AND s.project_id = ANY(p_project_ids))
        )
      GROUP BY s.project_id
    ) t;

    -- Daily stats from block_records
    SELECT COALESCE(jsonb_object_agg(day_name, cnt), '{}'::jsonb)
    INTO v_daily_stats
    FROM (
      SELECT 
        TO_CHAR(br.block_start AT TIME ZONE 'UTC', 'Dy') as day_name, 
        COUNT(*) as cnt
      FROM public.block_records br
      LEFT JOIN sessions s ON br.session_id = s.id
      WHERE br.organization_id = p_org_id
        AND br.block_start >= p_start_iso 
        AND br.block_end <= p_end_iso
        AND br.credited = true
        AND (
          (p_member_ids IS NULL AND p_project_ids IS NULL)
          OR (p_member_ids IS NOT NULL AND br.user_id = ANY(p_member_ids::uuid[]))
          OR (p_project_ids IS NOT NULL AND s.project_id = ANY(p_project_ids))
        )
      GROUP BY TO_CHAR(br.block_start AT TIME ZONE 'UTC', 'Dy')
    ) t;

  ELSE
    -- Fallback to activity_samples for historical periods
    SELECT 
      COUNT(*), 
      COALESCE(SUM(activity_percent), 0),
      COUNT(DISTINCT s.project_id),
      COUNT(DISTINCT s.user_id)
    INTO 
      v_total_mins, 
      v_activity_sum,
      v_projects_worked,
      v_active_members
    FROM activity_samples a
    JOIN sessions s ON a.session_id = s.id
    WHERE a.organization_id = p_org_id
      AND a.recorded_at >= p_start_iso 
      AND a.recorded_at <= p_end_iso
      AND (
        (p_member_ids IS NULL AND p_project_ids IS NULL)
        OR (p_member_ids IS NOT NULL AND s.user_id = ANY(p_member_ids::uuid[]))
        OR (p_project_ids IS NOT NULL AND s.project_id = ANY(p_project_ids))
      );
      
    v_activity_count := v_total_mins;

    SELECT 
      COUNT(*), 
      COALESCE(SUM(activity_percent), 0)
    INTO 
      v_prev_total_mins, 
      v_prev_activity_sum
    FROM activity_samples a
    JOIN sessions s ON a.session_id = s.id
    WHERE a.organization_id = p_org_id
      AND a.recorded_at >= p_prev_start_iso 
      AND a.recorded_at <= p_prev_end_iso
      AND (
        (p_member_ids IS NULL AND p_project_ids IS NULL)
        OR (p_member_ids IS NOT NULL AND s.user_id = ANY(p_member_ids::uuid[]))
        OR (p_project_ids IS NOT NULL AND s.project_id = ANY(p_project_ids))
      );
      
    v_prev_activity_count := v_prev_total_mins;

    SELECT jsonb_object_agg(COALESCE(app_name, 'Unknown'), cnt)
    INTO v_app_usage
    FROM (
      SELECT a.app_name, COUNT(*) as cnt
      FROM activity_samples a
      JOIN sessions s ON a.session_id = s.id
      WHERE a.organization_id = p_org_id
        AND a.recorded_at >= p_start_iso 
        AND a.recorded_at <= p_end_iso
        AND (
          (p_member_ids IS NULL AND p_project_ids IS NULL)
          OR (p_member_ids IS NOT NULL AND s.user_id = ANY(p_member_ids::uuid[]))
          OR (p_project_ids IS NOT NULL AND s.project_id = ANY(p_project_ids))
        )
        AND a.app_name IS NOT NULL
        AND TRIM(a.app_name) != ''
        AND LOWER(a.app_name) != 'program manager'
      GROUP BY a.app_name
      ORDER BY cnt DESC
      LIMIT 20
    ) t;

    SELECT COALESCE(jsonb_object_agg(user_id::text, json_build_object('mins', mins, 'activity_sum', act_sum, 'cnt', cnt)), '{}'::jsonb)
    INTO v_user_stats
    FROM (
      SELECT 
        s.user_id, 
        COUNT(*) as mins, 
        COALESCE(SUM(a.activity_percent), 0) as act_sum,
        COUNT(a.id) as cnt
      FROM activity_samples a
      JOIN sessions s ON a.session_id = s.id
      WHERE a.organization_id = p_org_id
        AND a.recorded_at >= p_start_iso 
        AND a.recorded_at <= p_end_iso
        AND (
          (p_member_ids IS NULL AND p_project_ids IS NULL)
          OR (p_member_ids IS NOT NULL AND s.user_id = ANY(p_member_ids::uuid[]))
          OR (p_project_ids IS NOT NULL AND s.project_id = ANY(p_project_ids))
        )
      GROUP BY s.user_id
    ) t;

    SELECT COALESCE(jsonb_object_agg(project_id::text, json_build_object('mins', mins, 'activity_sum', act_sum, 'cnt', cnt)), '{}'::jsonb)
    INTO v_proj_stats
    FROM (
      SELECT 
        s.project_id, 
        COUNT(*) as mins, 
        COALESCE(SUM(a.activity_percent), 0) as act_sum,
        COUNT(a.id) as cnt
      FROM activity_samples a
      JOIN sessions s ON a.session_id = s.id
      WHERE a.organization_id = p_org_id
        AND a.recorded_at >= p_start_iso 
        AND a.recorded_at <= p_end_iso
        AND s.project_id IS NOT NULL
        AND (
          (p_member_ids IS NULL AND p_project_ids IS NULL)
          OR (p_member_ids IS NOT NULL AND s.user_id = ANY(p_member_ids::uuid[]))
          OR (p_project_ids IS NOT NULL AND s.project_id = ANY(p_project_ids))
        )
      GROUP BY s.project_id
    ) t;

    SELECT COALESCE(jsonb_object_agg(day_name, cnt), '{}'::jsonb)
    INTO v_daily_stats
    FROM (
      SELECT 
        TO_CHAR(a.recorded_at AT TIME ZONE 'UTC', 'Dy') as day_name, 
        COUNT(*) as cnt
      FROM activity_samples a
      JOIN sessions s ON a.session_id = s.id
      WHERE a.organization_id = p_org_id
        AND a.recorded_at >= p_start_iso 
        AND a.recorded_at <= p_end_iso
        AND (
          (p_member_ids IS NULL AND p_project_ids IS NULL)
          OR (p_member_ids IS NOT NULL AND s.user_id = ANY(p_member_ids::uuid[]))
          OR (p_project_ids IS NOT NULL AND s.project_id = ANY(p_project_ids))
        )
      GROUP BY TO_CHAR(a.recorded_at AT TIME ZONE 'UTC', 'Dy')
    ) t;
  END IF;

  -- Screenshots query
  SELECT COALESCE(jsonb_agg(to_jsonb(ss)), '[]'::jsonb)
  INTO v_user_screenshots
  FROM (
    SELECT 
      ss.id,
      ss.user_id,
      ss.file_url as path,
      ss.recorded_at as recordedAt,
      COALESCE((
        SELECT ast.activity_percent 
        FROM activity_samples ast 
        WHERE ast.session_id = ss.session_id 
        ORDER BY ABS(EXTRACT(EPOCH FROM ast.recorded_at - ss.recorded_at)) ASC 
        LIMIT 1
      ), 0) as activityPercent
    FROM screenshots ss
    JOIN sessions s ON ss.session_id = s.id
    WHERE ss.organization_id = p_org_id
      AND ss.recorded_at >= p_start_iso 
      AND ss.recorded_at <= p_end_iso
      AND (
        (p_member_ids IS NULL AND p_project_ids IS NULL)
        OR (p_member_ids IS NOT NULL AND s.user_id = ANY(p_member_ids::uuid[]))
        OR (p_project_ids IS NOT NULL AND s.project_id = ANY(p_project_ids))
      )
    ORDER BY ss.recorded_at DESC
  ) ss;

  RETURN json_build_object(
    'total_mins', v_total_mins,
    'activity_sum', v_activity_sum,
    'activity_count', v_activity_count,
    'prev_total_mins', v_prev_total_mins,
    'prev_activity_sum', v_prev_activity_sum,
    'prev_activity_count', v_prev_activity_count,
    'screenshot_count', v_screenshot_count,
    'projects_worked', v_projects_worked,
    'active_members', v_active_members,
    'app_usage', v_app_usage,
    'user_stats', v_user_stats,
    'proj_stats', v_proj_stats,
    'daily_stats', v_daily_stats,
    'screenshots', v_user_screenshots
  );
END;
$$ LANGUAGE plpgsql;

NOTIFY pgrst, 'reload schema';
