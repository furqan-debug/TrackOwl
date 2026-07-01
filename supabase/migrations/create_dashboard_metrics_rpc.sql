-- ==============================================================
-- DigiReps Tracker — Dashboard Metrics Aggregation RPC
-- Aggregates metrics (active members, apps, screenshots, project metrics)
-- database-side to avoid sending tens of thousands of raw rows over the network.
-- ==============================================================

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
BEGIN
  -- 1. Get total screenshot count in current period
  SELECT COUNT(*)
  INTO v_screenshot_count
  FROM screenshots ss
  JOIN sessions s ON ss.session_id = s.id
  WHERE ss.organization_id = p_org_id
    AND ss.recorded_at >= p_start_iso 
    AND ss.recorded_at <= p_end_iso
    -- user_id is UUID in sessions, cast filter text[] to uuid[]
    AND (p_member_ids IS NULL OR s.user_id = ANY(p_member_ids::uuid[]))
    -- project_id is TEXT in sessions, compare directly with filter text[]
    AND (p_project_ids IS NULL OR s.project_id = ANY(p_project_ids));

  -- 2. General counts for current week
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
    AND (p_member_ids IS NULL OR s.user_id = ANY(p_member_ids::uuid[]))
    AND (p_project_ids IS NULL OR s.project_id = ANY(p_project_ids));
    
  v_activity_count := v_total_mins;

  -- 3. General counts for previous week
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
    AND (p_member_ids IS NULL OR s.user_id = ANY(p_member_ids::uuid[]))
    AND (p_project_ids IS NULL OR s.project_id = ANY(p_project_ids));
    
  v_prev_activity_count := v_prev_total_mins;

  -- 4. Top Apps usage
  SELECT jsonb_object_agg(COALESCE(app_name, 'Unknown'), cnt)
  INTO v_app_usage
  FROM (
    SELECT a.app_name, COUNT(*) as cnt
    FROM activity_samples a
    JOIN sessions s ON a.session_id = s.id
    WHERE a.organization_id = p_org_id
      AND a.recorded_at >= p_start_iso 
      AND a.recorded_at <= p_end_iso
      AND (p_member_ids IS NULL OR s.user_id = ANY(p_member_ids::uuid[]))
      AND (p_project_ids IS NULL OR s.project_id = ANY(p_project_ids))
      AND a.app_name IS NOT NULL
      AND TRIM(a.app_name) != ''
      AND LOWER(a.app_name) != 'program manager'
    GROUP BY a.app_name
    ORDER BY cnt DESC
    LIMIT 20
  ) t;

  -- 5. User stats (minutes and score)
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
      AND (p_member_ids IS NULL OR s.user_id = ANY(p_member_ids::uuid[]))
      AND (p_project_ids IS NULL OR s.project_id = ANY(p_project_ids))
    GROUP BY s.user_id
  ) t;

  -- 6. Project stats
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
      AND (p_member_ids IS NULL OR s.user_id = ANY(p_member_ids::uuid[]))
      AND (p_project_ids IS NULL OR s.project_id = ANY(p_project_ids))
    GROUP BY s.project_id
  ) t;

  -- 7. Daily stats (sample count per weekday)
  SELECT COALESCE(jsonb_object_agg(day_name, cnt), '{}'::jsonb)
  INTO v_daily_stats
  FROM (
    SELECT 
      CASE TRIM(to_char(a.recorded_at, 'Dy'))
        WHEN 'Mon' THEN 'Mon'
        WHEN 'Tue' THEN 'Tue'
        WHEN 'Wed' THEN 'Wed'
        WHEN 'Thu' THEN 'Thu'
        WHEN 'Fri' THEN 'Fri'
        WHEN 'Sat' THEN 'Sat'
        WHEN 'Sun' THEN 'Sun'
      END as day_name,
      COUNT(*) as cnt
    FROM activity_samples a
    JOIN sessions s ON a.session_id = s.id
    WHERE a.organization_id = p_org_id
      AND a.recorded_at >= p_start_iso 
      AND a.recorded_at <= p_end_iso
      AND (p_member_ids IS NULL OR s.user_id = ANY(p_member_ids::uuid[]))
      AND (p_project_ids IS NULL OR s.project_id = ANY(p_project_ids))
    GROUP BY day_name
  ) t;

  -- 8. Screenshots with nearest activity percent, partitioned per user (up to 3 each)
  SELECT COALESCE(jsonb_agg(row_to_json(t_screenshots)), '[]'::jsonb)
  INTO v_user_screenshots
  FROM (
    SELECT 
      ss_id as id,
      file_url as path,
      recorded_at as "recordedAt",
      user_id,
      COALESCE(
        (
          SELECT activity_percent 
          FROM activity_samples 
          WHERE session_id = ss_session_id 
            AND recorded_at >= t_inner.recorded_at - interval '10 minutes'
            AND recorded_at <= t_inner.recorded_at + interval '10 minutes'
          ORDER BY abs(extract(epoch from (recorded_at - t_inner.recorded_at))) ASC
          LIMIT 1
        ), 50
      ) as "activityPercent"
    FROM (
      SELECT 
        ss.id as ss_id,
        ss.session_id as ss_session_id,
        ss.file_url,
        ss.recorded_at,
        s.user_id,
        ROW_NUMBER() OVER (PARTITION BY s.user_id ORDER BY ss.recorded_at DESC) as rn
      FROM screenshots ss
      JOIN sessions s ON ss.session_id = s.id
      WHERE ss.organization_id = p_org_id
        AND ss.recorded_at >= p_start_iso 
        AND ss.recorded_at <= p_end_iso
        AND (p_member_ids IS NULL OR s.user_id = ANY(p_member_ids::uuid[]))
        AND (p_project_ids IS NULL OR s.project_id = ANY(p_project_ids))
    ) t_inner
    WHERE rn <= 3
  ) t_screenshots;

  RETURN json_build_object(
    'total_mins', v_total_mins,
    'activity_sum', v_activity_sum,
    'activity_count', v_activity_count,
    'prev_total_mins', v_prev_total_mins,
    'prev_activity_sum', v_prev_activity_sum,
    'prev_activity_count', v_prev_activity_count,
    'app_usage', COALESCE(v_app_usage, '{}'::jsonb),
    'user_stats', COALESCE(v_user_stats, '{}'::jsonb),
    'proj_stats', COALESCE(v_proj_stats, '{}'::jsonb),
    'daily_stats', COALESCE(v_daily_stats, '{}'::jsonb),
    'screenshots', COALESCE(v_user_screenshots, '[]'::jsonb),
    'screenshot_count', v_screenshot_count,
    'projects_worked', v_projects_worked,
    'active_members', v_active_members
  )::jsonb;
END;
$$ LANGUAGE plpgsql;
