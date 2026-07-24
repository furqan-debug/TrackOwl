-- ==============================================================
-- Fix: Reports RPC was bucketing stale open sessions (no ended_at)
-- to the first day of the range, inflating time (e.g. 157h).
--
-- Root cause: GREATEST(s.started_at, p_start_iso) was used for
-- both the day_str bucket AND the duration clamp start. An old
-- never-ended session would get placed on day-1 of the range with
-- duration = entire range width (e.g. 7 days = 168h).
--
-- Fix: Only include sessions whose started_at falls WITHIN the
-- requested range. Sessions starting before p_start_iso are excluded
-- (matches the old sample-based behavior). Day bucket uses the real
-- s.started_at so active sessions appear on the correct day.
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
  -- ── 1. Session-duration-based totals ───────────────────────────────────────
  -- Only sessions that STARTED within the requested range are included.
  -- This prevents stale open sessions (no ended_at) from spanning multiple
  -- days or inflating totals.
  -- Day is bucketed to the session's real start day in org timezone.
  -- Active sessions (no ended_at) are clamped to MIN(NOW(), p_end_iso).
  CREATE TEMP TABLE _session_daily ON COMMIT DROP AS
  SELECT
    s.user_id,
    TO_CHAR(s.started_at AT TIME ZONE p_org_tz, 'YYYY-MM-DD') AS day_str,
    GREATEST(0, ROUND(
      EXTRACT(EPOCH FROM (
        LEAST(COALESCE(s.ended_at, NOW()), p_end_iso) - s.started_at
      )) / 60
    ))::bigint AS duration_mins
  FROM sessions s
  WHERE s.organization_id = p_org_id
    AND s.manual = false
    AND s.started_at >= p_start_iso
    AND s.started_at < p_end_iso
    AND (p_member_ids IS NULL OR s.user_id = ANY(p_member_ids::uuid[]));

  -- ── 2. Sample-based activity (for score % and app breakdown only) ──────────
  CREATE TEMP TABLE _sample_activity ON COMMIT DROP AS
  SELECT DISTINCT ON (s.user_id, date_trunc('minute', a.recorded_at))
    a.activity_percent,
    a.app_name,
    s.user_id,
    TO_CHAR(a.recorded_at AT TIME ZONE p_org_tz, 'YYYY-MM-DD') AS day_str
  FROM activity_samples a
  JOIN sessions s ON a.session_id = s.id
  WHERE a.organization_id = p_org_id
    AND a.recorded_at >= p_start_iso
    AND a.recorded_at <= p_end_iso
    AND (p_member_ids IS NULL OR s.user_id = ANY(p_member_ids::uuid[]))
  ORDER BY s.user_id, date_trunc('minute', a.recorded_at), a.activity_percent DESC;

  -- Pre-aggregate sample totals by day
  CREATE TEMP TABLE _sample_day ON COMMIT DROP AS
  SELECT day_str,
         SUM(activity_percent)::numeric AS activity_sum,
         COUNT(*)::bigint               AS sample_count
  FROM _sample_activity
  GROUP BY day_str;

  CREATE TEMP TABLE _sample_user_day ON COMMIT DROP AS
  SELECT user_id,
         day_str,
         SUM(activity_percent)::numeric AS activity_sum,
         COUNT(*)::bigint               AS sample_count
  FROM _sample_activity
  GROUP BY user_id, day_str;

  -- ── 3. Daily totals across all users ──────────────────────────────────────
  SELECT jsonb_agg(row_to_json(t)) INTO v_daily
  FROM (
    SELECT
      sd.day_str                                    AS date,
      SUM(sd.duration_mins)                         AS total_minutes,
      COALESCE(sa.activity_sum,  0)                 AS activity_sum,
      COALESCE(sa.sample_count,  0)                 AS sample_count
    FROM (SELECT day_str, SUM(duration_mins) AS duration_mins FROM _session_daily GROUP BY day_str) sd
    LEFT JOIN _sample_day sa ON sa.day_str = sd.day_str
    GROUP BY sd.day_str, sa.activity_sum, sa.sample_count
    ORDER BY sd.day_str ASC
  ) t;

  -- ── 4. Daily totals per user ───────────────────────────────────────────────
  SELECT jsonb_agg(row_to_json(t)) INTO v_user_daily
  FROM (
    SELECT
      sd.user_id,
      sd.day_str                                    AS date,
      SUM(sd.duration_mins)                         AS total_minutes,
      COALESCE(sa.activity_sum,  0)                 AS activity_sum,
      COALESCE(sa.sample_count,  0)                 AS sample_count
    FROM (SELECT user_id, day_str, SUM(duration_mins) AS duration_mins FROM _session_daily GROUP BY user_id, day_str) sd
    LEFT JOIN _sample_user_day sa ON sa.user_id = sd.user_id AND sa.day_str = sd.day_str
    GROUP BY sd.user_id, sd.day_str, sa.activity_sum, sa.sample_count
  ) t;

  -- ── 5. App totals (sample-based) ──────────────────────────────────────────
  SELECT jsonb_agg(row_to_json(t)) INTO v_apps
  FROM (
    SELECT app_name,
           COUNT(*)              AS total_minutes,
           SUM(activity_percent) AS activity_sum
    FROM _sample_activity
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
