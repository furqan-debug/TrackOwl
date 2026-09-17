-- =============================================================================
-- Unify time calculation logic across all pages using block_records
--
-- 1. Updates get_sessions_activity_stats:
--    Reads from public.block_records as the primary source of truth.
--    Clamps each block duration to at most 600s (10 minutes) to defensively
--    guard against clock skips / sleep gaps.
--    Falls back to activity_samples only if a session has no block_records yet
--    (e.g., brand-new live sessions before the first 10-minute block is flushed).
--
-- 2. Updates get_reports_aggregated_data:
--    Hardens all duration calculations with LEAST(EXTRACT(EPOCH...), 600)
--    so Reports and Timesheets use the exact same formula.
-- =============================================================================

-- ── 1. get_sessions_activity_stats ───────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_sessions_activity_stats(text[]);
DROP FUNCTION IF EXISTS public.get_sessions_activity_stats(uuid[]);

CREATE OR REPLACE FUNCTION public.get_sessions_activity_stats(p_session_ids text[])
RETURNS TABLE(
  session_id       uuid,
  duration_mins    numeric,
  sample_count     bigint,
  activity_sum     numeric,
  activity_percent numeric,
  last_sample_at   timestamptz,
  offline_count    bigint,
  active_count     bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH requested_sessions AS (
    SELECT DISTINCT unnest(p_session_ids::uuid[]) AS sess_id
  ),
  -- 1. Aggregate from block_records (the single source of truth)
  block_stats AS (
    SELECT
      br.session_id,
      COALESCE(ROUND(SUM(LEAST(EXTRACT(EPOCH FROM (br.block_end - br.block_start)), 600)) FILTER (WHERE br.credited = true) / 60), 0)::numeric AS duration_mins,
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
      a.session_id,
      COUNT(DISTINCT date_trunc('minute', a.recorded_at))::numeric                        AS duration_mins,
      COUNT(DISTINCT date_trunc('minute', a.recorded_at))::bigint                         AS sample_count,
      COALESCE(SUM(a.activity_percent), 0)::numeric                                       AS activity_sum,
      COALESCE(AVG(a.activity_percent), 0)::numeric                                       AS activity_percent,
      MAX(a.recorded_at)                                                                  AS last_sample_at,
      COUNT(*) FILTER (WHERE a.is_offline = true)::bigint                                 AS offline_count,
      COUNT(*) FILTER (WHERE a.idle = false)::bigint                                      AS active_count
    FROM public.activity_samples a
    WHERE a.session_id = ANY(p_session_ids::uuid[])
      AND a.session_id NOT IN (SELECT session_id FROM block_stats)
    GROUP BY a.session_id
  )
  SELECT
    rs.sess_id AS session_id,
    COALESCE(bs.duration_mins, ss.duration_mins, 0) AS duration_mins,
    COALESCE(bs.sample_count, ss.sample_count, 0)   AS sample_count,
    COALESCE(bs.activity_sum, ss.activity_sum, 0)   AS activity_sum,
    COALESCE(bs.activity_percent, ss.activity_percent, 0) AS activity_percent,
    COALESCE(bs.last_sample_at, ss.last_sample_at, NULL) AS last_sample_at,
    COALESCE(bs.offline_count, ss.offline_count, 0) AS offline_count,
    COALESCE(bs.active_count, ss.active_count, 0)   AS active_count
  FROM requested_sessions rs
  LEFT JOIN block_stats bs ON rs.sess_id = bs.session_id
  LEFT JOIN sample_stats ss ON rs.sess_id = ss.session_id
  WHERE bs.session_id IS NOT NULL OR ss.session_id IS NOT NULL;
END;
$function$;

COMMENT ON FUNCTION public.get_sessions_activity_stats IS
  'Per-session totals for Timesheets and Activity pages. Uses block_records as the authoritative primary source with per-minute activity_samples fallback for live sessions under 10 minutes.';


-- ── 2. get_reports_aggregated_data ──────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_reports_aggregated_data(uuid, timestamptz, timestamptz, text, text[]);

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
  -- Daily totals (org-wide) from block_records (clamped to 600s max per block)
  SELECT jsonb_agg(row_to_json(t)) INTO v_daily
  FROM (
    SELECT
      business_date::text AS date,
      COALESCE(ROUND(SUM(LEAST(EXTRACT(EPOCH FROM (block_end - block_start)), 600)) FILTER (WHERE credited = true) / 60), 0)::bigint AS total_minutes,
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

  -- Per-user daily totals from block_records (clamped to 600s max per block)
  SELECT jsonb_agg(row_to_json(t)) INTO v_user_daily
  FROM (
    SELECT
      user_id,
      business_date::text AS date,
      COALESCE(ROUND(SUM(LEAST(EXTRACT(EPOCH FROM (block_end - block_start)), 600)) FILTER (WHERE credited = true) / 60), 0)::bigint AS total_minutes,
      COALESCE(SUM(activity_percent) FILTER (WHERE credited = true), 0)::numeric AS activity_sum,
      COUNT(*) FILTER (WHERE credited = true) AS sample_count
    FROM public.block_records
    WHERE organization_id = p_org_id
      AND block_start >= p_start_iso
      AND block_end   <= p_end_iso
      AND (p_member_ids IS NULL OR user_id = ANY(p_member_ids::uuid[]))
    GROUP BY user_id, business_date
  ) t;

  -- App usage totals from block_records (clamped to 600s max per block)
  SELECT jsonb_agg(row_to_json(t)) INTO v_apps
  FROM (
    SELECT
      app_name,
      COALESCE(ROUND(SUM(LEAST(EXTRACT(EPOCH FROM (block_end - block_start)), 600)) / 60), 0)::bigint AS total_minutes,
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

NOTIFY pgrst, 'reload schema';
