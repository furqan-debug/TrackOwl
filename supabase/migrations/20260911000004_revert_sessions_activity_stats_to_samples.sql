-- =============================================================================
-- REVERT get_sessions_activity_stats to activity_samples
--
-- The function was switched to read block_records exclusively, with an INNER
-- JOIN and no fallback. block_records are written by the Rust tracker, and only
-- machines running the new desktop build produce them — so for every member
-- still on the older build the function returns NO ROWS, Timesheets reads
-- `stats` as undefined, and every duration renders as 0.
--
-- Measured before writing this, over the last three days:
--
--   organization      sessions   activity_samples   block_records
--   71895eda (test)        171             96,020             728
--   aeceb4fc (prod)        182             31,720               0   <-- all zero
--
-- 182 production sessions holding 31,720 samples were reporting nothing.
--
-- Back to samples, which BOTH builds write, so every member is covered
-- regardless of which desktop version they are on. Switch back to block_records
-- once the new build has actually rolled out — and then with a fallback, not an
-- INNER JOIN.
--
-- The return signature is unchanged, so no client change is needed.
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_sessions_activity_stats(text[]);

CREATE OR REPLACE FUNCTION public.get_sessions_activity_stats(p_session_ids text[])
RETURNS TABLE(
  session_id      uuid,
  duration_mins   numeric,
  sample_count    bigint,
  activity_sum    numeric,
  activity_percent numeric,
  last_sample_at  timestamptz,
  offline_count   bigint,
  active_count    bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  -- One row per recorded minute. A session can hold two samples stamped inside
  -- the same minute after an offline catch-up; counting both would bill the
  -- minute twice. Highest activity wins the tie, matching Reports and the
  -- desktop client.
  WITH deduped AS (
    SELECT DISTINCT ON (a.session_id, date_trunc('minute', a.recorded_at))
      a.session_id,
      a.recorded_at,
      a.activity_percent,
      a.idle,
      a.is_offline
    FROM public.activity_samples a
    WHERE a.session_id = ANY(p_session_ids::uuid[])
    ORDER BY a.session_id, date_trunc('minute', a.recorded_at),
             a.activity_percent DESC, a.recorded_at
  )
  SELECT
    d.session_id,
    COUNT(*)::numeric                                        AS duration_mins,
    COUNT(*)::bigint                                         AS sample_count,
    COALESCE(SUM(d.activity_percent), 0)::numeric            AS activity_sum,
    COALESCE(AVG(d.activity_percent), 0)::numeric            AS activity_percent,
    MAX(d.recorded_at)                                       AS last_sample_at,
    COUNT(*) FILTER (WHERE d.is_offline = true)::bigint      AS offline_count,
    COUNT(*) FILTER (WHERE d.idle = false)::bigint           AS active_count
  FROM deduped d
  GROUP BY d.session_id;
END;
$function$;

COMMENT ON FUNCTION public.get_sessions_activity_stats IS
  'Per-session totals for Timesheets, one credited minute per recorded minute. Reads activity_samples because every desktop build writes them; block_records are only written by the newer build and cover a fraction of members.';

NOTIFY pgrst, 'reload schema';
