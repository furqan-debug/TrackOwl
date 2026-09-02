-- ==============================================================
-- Match Reports Page Total Time with Desktop App (Productive Time)
-- Calculates total_minutes from actual distinct activity sample minutes
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
  -- ── 1. Sample-based activity (deduped by minute per user, matching desktop app) ──
  CREATE TEMP TABLE _sample_activity ON COMMIT DROP AS
  SELECT DISTINCT ON (s.user_id, date_trunc('minute', a.recorded_at))
    a.activity_percent,
    a.app_name,
    s.user_id,
    TO_CHAR(a.recorded_at AT TIME ZONE p_org_tz, 'YYYY-MM-DD') AS day_str
  FROM activity_samples a
  JOIN sessions s ON a.session_id = s.id
  WHERE (a.organization_id = p_org_id OR s.organization_id = p_org_id)
    AND a.recorded_at >= p_start_iso
    AND a.recorded_at <= p_end_iso
    AND (p_member_ids IS NULL OR s.user_id = ANY(p_member_ids::uuid[]))
  ORDER BY s.user_id, date_trunc('minute', a.recorded_at), a.activity_percent DESC;

  -- ── 2. Pre-aggregate sample totals by day ──────────────────────────────────
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

  -- ── 3. Daily totals across all users (productive minutes from samples) ──────
  SELECT jsonb_agg(row_to_json(t)) INTO v_daily
  FROM (
    SELECT
      sd.day_str                                    AS date,
      sd.sample_count                               AS total_minutes,
      sd.activity_sum                               AS activity_sum,
      sd.sample_count                               AS sample_count
    FROM _sample_day sd
    ORDER BY sd.day_str ASC
  ) t;

  -- ── 4. Daily totals per user (productive minutes from samples) ───────────────
  SELECT jsonb_agg(row_to_json(t)) INTO v_user_daily
  FROM (
    SELECT
      sud.user_id,
      sud.day_str                                   AS date,
      sud.sample_count                              AS total_minutes,
      sud.activity_sum                              AS activity_sum,
      sud.sample_count                              AS sample_count
    FROM _sample_user_day sud
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
