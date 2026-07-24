-- ==============================================================
-- DigiReps Tracker — Change: Reports show Total Tracked Time
-- Previously the RPC filtered out long idle blocks so that only
-- "productive" minutes were counted. Now we count every deduplicated
-- minute sample (regardless of idle flag) so that the Reports page
-- shows total tracked time, consistent with the Timesheets page.
-- The idle_limit / idle_enabled settings still apply to activity
-- scoring (activityPercent) but no longer affect total tracked time.
-- ==============================================================

DROP FUNCTION IF EXISTS public.get_reports_aggregated_data(uuid, timestamptz, timestamptz, text, text[]);

CREATE OR REPLACE FUNCTION public.get_reports_aggregated_data(
  p_org_id uuid,
  p_start_iso timestamptz,
  p_end_iso timestamptz,
  p_org_tz text,
  p_member_ids text[] DEFAULT NULL
)
RETURNS jsonb
SECURITY DEFINER
VOLATILE
AS $$
DECLARE
  v_daily jsonb;
  v_user_daily jsonb;
  v_apps jsonb;
BEGIN
  -- Materialize ALL deduplicated minute samples (idle or not) into a temp
  -- table so we can query it three times without repeating the CTE chain.
  -- We no longer filter out long idle blocks — every minute the tracker
  -- was running counts toward total tracked time.
  CREATE TEMP TABLE _all_samples ON COMMIT DROP AS
  SELECT DISTINCT ON (s.user_id, date_trunc('minute', a.recorded_at))
    a.session_id,
    a.recorded_at,
    a.activity_percent,
    a.idle,
    a.app_name,
    s.user_id,
    s.manual,
    TO_CHAR(a.recorded_at AT TIME ZONE p_org_tz, 'YYYY-MM-DD') AS day_str
  FROM activity_samples a
  JOIN sessions s ON a.session_id = s.id
  WHERE a.organization_id = p_org_id
    AND a.recorded_at >= p_start_iso
    AND a.recorded_at <= p_end_iso
    AND (p_member_ids IS NULL OR s.user_id = ANY(p_member_ids::uuid[]))
  ORDER BY s.user_id, date_trunc('minute', a.recorded_at), a.activity_percent DESC;

  -- 1. Daily totals across all users
  SELECT jsonb_agg(row_to_json(t)) INTO v_daily
  FROM (
    SELECT day_str AS date,
           COUNT(*)              AS total_minutes,
           SUM(activity_percent) AS activity_sum
    FROM _all_samples
    GROUP BY day_str
    ORDER BY day_str ASC
  ) t;

  -- 2. Daily totals per user
  SELECT jsonb_agg(row_to_json(t)) INTO v_user_daily
  FROM (
    SELECT user_id,
           day_str AS date,
           COUNT(*)              AS total_minutes,
           SUM(activity_percent) AS activity_sum
    FROM _all_samples
    GROUP BY user_id, day_str
  ) t;

  -- 3. App totals
  SELECT jsonb_agg(row_to_json(t)) INTO v_apps
  FROM (
    SELECT app_name,
           COUNT(*)              AS total_minutes,
           SUM(activity_percent) AS activity_sum
    FROM _all_samples
    WHERE app_name IS NOT NULL AND TRIM(app_name) != ''
    GROUP BY app_name
    ORDER BY COUNT(*) DESC
  ) t;

  RETURN jsonb_build_object(
    'daily_stats',      COALESCE(v_daily,      '[]'::jsonb),
    'user_daily_stats', COALESCE(v_user_daily, '[]'::jsonb),
    'app_stats',        COALESCE(v_apps,       '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql;
