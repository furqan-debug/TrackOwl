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
