-- ==============================================================
-- DigiReps Tracker — Change: Reports use SESSION DURATION for
-- total tracked time, matching the Timesheets page exactly.
--
-- Previously total_minutes was counted by sample rows (1 sample = 1 min),
-- so offline gaps / sync delays reduced the reported total.
-- Now total_minutes = SUM(ended_at - started_at) per user per day,
-- identical to how Timesheets calculates duration.
--
-- Activity % is still derived from deduplicated samples (correct).
-- A new field sample_count is returned so the frontend can average
-- activity_sum / sample_count instead of activity_sum / total_minutes.
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
  -- Each non-manual session contributes (effective_end - started_at) minutes.
  -- Sessions are clamped to [p_start_iso, p_end_iso] so edge sessions don't
  -- inflate counts. Day is derived from the session's start time in org-tz.
  CREATE TEMP TABLE _session_daily ON COMMIT DROP AS
  SELECT
    s.user_id,
    TO_CHAR(
      GREATEST(s.started_at, p_start_iso) AT TIME ZONE p_org_tz,
      'YYYY-MM-DD'
    ) AS day_str,
    GREATEST(0, ROUND(
      EXTRACT(EPOCH FROM (
        LEAST(COALESCE(s.ended_at, NOW()), p_end_iso)
        - GREATEST(s.started_at, p_start_iso)
      )) / 60
    ))::bigint AS duration_mins
  FROM sessions s
  WHERE s.organization_id = p_org_id
    AND s.manual = false
    AND s.started_at < p_end_iso
    AND (s.ended_at IS NULL OR s.ended_at > p_start_iso)
    AND (p_member_ids IS NULL OR s.user_id = ANY(p_member_ids::uuid[]));

  -- ── 2. Sample-based activity (for score % and app breakdown only) ──────────
  -- De-duplicated to one sample per user per minute.
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

  -- Pre-aggregate sample totals by day (for efficient joining)
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

  -- ── 5. App totals (sample-based, unchanged) ────────────────────────────────
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
