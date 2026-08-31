-- ==============================================================
-- DigiReps Tracker — Timesheet and Reports Aggregation RPCs
-- Database-side aggregations to optimize Timesheets and Reports page loading
-- ==============================================================

-- 1. RPC for Timesheets page: aggregates activity stats per session
DROP FUNCTION IF EXISTS public.get_sessions_activity_stats(uuid[]);
DROP FUNCTION IF EXISTS public.get_sessions_activity_stats(text[]);

CREATE OR REPLACE FUNCTION public.get_sessions_activity_stats(p_session_ids text[])
RETURNS TABLE(
  session_id uuid,
  sample_count bigint,
  activity_sum bigint,
  last_sample_at timestamptz,
  offline_count bigint,
  active_count bigint
) 
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.session_id,
    COUNT(*),
    COALESCE(SUM(a.activity_percent), 0)::bigint,
    MAX(a.recorded_at),
    COUNT(CASE WHEN a.is_offline = true THEN 1 END),
    COUNT(CASE WHEN a.idle = false THEN 1 END)
  FROM activity_samples a
  WHERE a.session_id = ANY(p_session_ids::uuid[])
  GROUP BY a.session_id;
END;
$$ LANGUAGE plpgsql;

-- 2. RPC for Reports page: aggregates amounts owed stats per user
DROP FUNCTION IF EXISTS public.get_amounts_owed_stats(uuid, timestamptz);

CREATE OR REPLACE FUNCTION public.get_amounts_owed_stats(p_org_id uuid, p_start_iso timestamptz)
RETURNS TABLE(
  user_id uuid,
  productive_mins bigint,
  last_tracked timestamptz
)
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.user_id,
    COUNT(CASE WHEN a.idle = false THEN 1 END),
    MAX(a.recorded_at)
  FROM activity_samples a
  JOIN sessions s ON a.session_id = s.id
  WHERE a.organization_id = p_org_id
    AND a.recorded_at >= p_start_iso
  GROUP BY s.user_id;
END;
$$ LANGUAGE plpgsql;

-- 3. RPC to stream raw activity samples — uses RETURNS TABLE (not jsonb_agg) to avoid
--    loading the entire result set into a single in-memory JSONB blob, which caused
--    HTTP 500 errors when selecting ranges longer than ~2 weeks for large orgs.
DROP FUNCTION IF EXISTS public.get_raw_activity_samples(uuid, timestamptz, timestamptz, text[]);
DROP FUNCTION IF EXISTS public.get_raw_activity_samples(uuid, timestamptz, timestamptz, uuid[]);

CREATE OR REPLACE FUNCTION public.get_raw_activity_samples(
  p_org_id uuid,
  p_start_iso timestamptz,
  p_end_iso timestamptz,
  p_member_ids text[] DEFAULT NULL
)
RETURNS TABLE(
  session_id   uuid,
  recorded_at  timestamptz,
  activity_percent numeric,
  idle         boolean,
  app_name     text
)
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.session_id,
    a.recorded_at,
    a.activity_percent,
    a.idle,
    a.app_name
  FROM activity_samples a
  JOIN sessions s ON a.session_id = s.id
  WHERE a.organization_id = p_org_id
    AND a.recorded_at >= p_start_iso
    AND a.recorded_at <= p_end_iso
    AND (p_member_ids IS NULL OR s.user_id = ANY(p_member_ids::uuid[]))
  ORDER BY a.recorded_at ASC;
END;
$$ LANGUAGE plpgsql;

