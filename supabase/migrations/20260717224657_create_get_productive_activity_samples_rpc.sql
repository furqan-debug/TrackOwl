-- ==============================================================
-- DigiReps Tracker — Optimized Productive Samples RPC
-- ==============================================================

DROP FUNCTION IF EXISTS public.get_productive_activity_samples(uuid, timestamptz, timestamptz, text[]);

CREATE OR REPLACE FUNCTION public.get_productive_activity_samples(
  p_org_id uuid,
  p_start_iso timestamptz,
  p_end_iso timestamptz,
  p_member_ids text[] DEFAULT NULL
)
RETURNS jsonb
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH deduped AS (
    SELECT DISTINCT ON (s.user_id, date_trunc('minute', a.recorded_at))
      a.session_id,
      a.recorded_at,
      a.activity_percent,
      a.idle,
      a.app_name,
      s.user_id,
      s.manual
    FROM activity_samples a
    JOIN sessions s ON a.session_id = s.id
    WHERE a.organization_id = p_org_id
      AND a.recorded_at >= p_start_iso
      AND a.recorded_at <= p_end_iso
      AND (p_member_ids IS NULL OR s.user_id = ANY(p_member_ids::uuid[]))
    ORDER BY s.user_id, date_trunc('minute', a.recorded_at), a.activity_percent DESC
  ),
  lagged AS (
    SELECT *,
           LAG(recorded_at) OVER (PARTITION BY user_id ORDER BY recorded_at) AS prev_time,
           LAG(idle) OVER (PARTITION BY user_id ORDER BY recorded_at) AS prev_idle
    FROM deduped
  ),
  blocks AS (
    SELECT *,
           SUM(CASE WHEN prev_time IS NULL
                      OR idle != prev_idle
                      OR EXTRACT(EPOCH FROM (recorded_at - prev_time)) > 125 
                    THEN 1 ELSE 0 END) OVER (PARTITION BY user_id ORDER BY recorded_at) AS block_id
    FROM lagged
  ),
  block_counts AS (
    SELECT block_id, COUNT(*) as block_len
    FROM blocks
    GROUP BY block_id
  ),
  productive AS (
    SELECT b.session_id,
           b.recorded_at,
           b.activity_percent,
           b.idle,
           b.app_name,
           b.user_id
    FROM blocks b
    JOIN block_counts bc ON b.block_id = bc.block_id
    JOIN members m ON b.user_id = m.id
    WHERE (b.manual = true) OR (b.idle = false OR COALESCE(m.idle_limit, 0) <= 1 OR bc.block_len <= m.idle_limit)
  )
  SELECT jsonb_agg(row_to_json(t))
  INTO v_result
  FROM (
    SELECT session_id, recorded_at, activity_percent, idle, app_name
    FROM productive
    ORDER BY recorded_at ASC
  ) t;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;
