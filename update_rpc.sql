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
    AND (
      (p_member_ids IS NULL AND p_project_ids IS NULL)
      OR (p_member_ids IS NOT NULL AND s.user_id = ANY(p_member_ids::uuid[]))
      OR (p_project_ids IS NOT NULL AND s.project_id = ANY(p_project_ids))
    );

  -- 2. Massive CTE to unify everything safely without deduplication bugs
  WITH current_sessions AS (
    SELECT id as session_id, user_id, project_id, organization_id, manual, started_at, COALESCE(ended_at, now()) as ended_at
    FROM sessions s
    WHERE s.organization_id = p_org_id
      AND (
        (p_member_ids IS NULL AND p_project_ids IS NULL)
        OR (p_member_ids IS NOT NULL AND s.user_id = ANY(p_member_ids::uuid[]))
        OR (p_project_ids IS NOT NULL AND s.project_id = ANY(p_project_ids))
      )
  ),
  unified_current AS (
    -- Deduped Real Samples
    SELECT DISTINCT ON (a.session_id, date_trunc('minute', a.recorded_at))
      a.id, a.session_id, a.activity_percent, a.app_name, a.recorded_at, s.project_id, s.user_id
    FROM activity_samples a
    JOIN current_sessions s ON a.session_id = s.session_id
    WHERE a.organization_id = p_org_id
      AND a.recorded_at >= p_start_iso 
      AND a.recorded_at <= p_end_iso

    UNION ALL

    -- Synthetic Manual Samples (Floor rounding, 1-minute steps)
    SELECT
      NULL::bigint as id, s.session_id, 0 as activity_percent, 'Manual Time' as app_name, 
      s.started_at + (i || ' minutes')::interval as recorded_at, s.project_id, s.user_id
    FROM current_sessions s
    CROSS JOIN LATERAL generate_series(
        1, 
        GREATEST(0, floor(EXTRACT(EPOCH FROM (s.ended_at - s.started_at))/60)::int)
    ) as i
    WHERE s.manual = true
      AND (s.started_at + (i || ' minutes')::interval) >= p_start_iso
      AND (s.started_at + (i || ' minutes')::interval) <= p_end_iso
  ),
  unified_prev AS (
    SELECT DISTINCT ON (a.session_id, date_trunc('minute', a.recorded_at))
      a.id, a.session_id, a.activity_percent
    FROM activity_samples a
    JOIN current_sessions s ON a.session_id = s.session_id
    WHERE a.organization_id = p_org_id
      AND a.recorded_at >= p_prev_start_iso 
      AND a.recorded_at <= p_prev_end_iso

    UNION ALL

    SELECT
      NULL::bigint as id, s.session_id, 0 as activity_percent
    FROM current_sessions s
    CROSS JOIN LATERAL generate_series(
        1, 
        GREATEST(0, floor(EXTRACT(EPOCH FROM (s.ended_at - s.started_at))/60)::int)
    ) as i
    WHERE s.manual = true
      AND (s.started_at + (i || ' minutes')::interval) >= p_prev_start_iso
      AND (s.started_at + (i || ' minutes')::interval) <= p_prev_end_iso
  )
  SELECT
    (SELECT COUNT(*) FROM unified_current),
    (SELECT COALESCE(SUM(activity_percent), 0) FROM unified_current),
    (SELECT COUNT(DISTINCT project_id) FROM unified_current),
    (SELECT COUNT(DISTINCT user_id) FROM unified_current),
    (SELECT COUNT(*) FROM unified_prev),
    (SELECT COALESCE(SUM(activity_percent), 0) FROM unified_prev),
    (SELECT COALESCE(jsonb_object_agg(COALESCE(app_name, 'Unknown'), cnt), '{}'::jsonb) FROM (
      SELECT app_name, COUNT(*) as cnt FROM unified_current WHERE app_name IS NOT NULL AND TRIM(app_name) != '' AND LOWER(app_name) != 'program manager' GROUP BY app_name ORDER BY cnt DESC LIMIT 20
    ) t),
    (SELECT COALESCE(jsonb_object_agg(user_id::text, json_build_object('mins', mins, 'activity_sum', act_sum, 'cnt', cnt)), '{}'::jsonb) FROM (
      SELECT user_id, COUNT(*) as mins, COALESCE(SUM(activity_percent), 0) as act_sum, COUNT(*) as cnt FROM unified_current GROUP BY user_id
    ) t),
    (SELECT COALESCE(jsonb_object_agg(project_id::text, json_build_object('mins', mins, 'activity_sum', act_sum, 'cnt', cnt)), '{}'::jsonb) FROM (
      SELECT project_id, COUNT(*) as mins, COALESCE(SUM(activity_percent), 0) as act_sum, COUNT(*) as cnt FROM unified_current WHERE project_id IS NOT NULL GROUP BY project_id
    ) t),
    (SELECT COALESCE(jsonb_object_agg(day_name, cnt), '{}'::jsonb) FROM (
      SELECT TO_CHAR(recorded_at AT TIME ZONE 'UTC', 'Dy') as day_name, COUNT(*) as cnt FROM unified_current GROUP BY TO_CHAR(recorded_at AT TIME ZONE 'UTC', 'Dy')
    ) t)
  INTO
    v_total_mins,
    v_activity_sum,
    v_projects_worked,
    v_active_members,
    v_prev_total_mins,
    v_prev_activity_sum,
    v_app_usage,
    v_user_stats,
    v_proj_stats,
    v_daily_stats;

  v_activity_count := v_total_mins;
  v_prev_activity_count := v_prev_total_mins;

  -- 8. User screenshots (for recent activity preview)
  SELECT COALESCE(jsonb_agg(to_jsonb(ss)), '[]'::jsonb)
  INTO v_user_screenshots
  FROM (
    SELECT 
      ss.id,
      ss.user_id,
      ss.file_url as path,
      ss.recorded_at as "recordedAt",
      COALESCE((
        SELECT activity_percent 
        FROM activity_samples ast 
        WHERE ast.session_id = ss.session_id 
        ORDER BY ABS(EXTRACT(EPOCH FROM ast.recorded_at - ss.recorded_at)) ASC 
        LIMIT 1
      ), 0) as "activityPercent"
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
