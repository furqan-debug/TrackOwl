-- =============================================================================
-- Fix ghost block_records + harden get_sessions_activity_stats
--
-- Part A: Delete all ghost block_records (>1 hour duration, ≤10 active seconds).
--   These are created when the desktop app restarts after an offline session and
--   the SQLite cache uploads a stale block with block_end = current server time
--   instead of block_start + 600s. They contain near-zero activity and cause:
--     1. Phantom Timesheet entries spanning midnight (e.g. "12:00 am – 4:56 am")
--     2. Inflated desktop timer at shift start (business_date mismatch)
--
-- Part B: Harden get_sessions_activity_stats so even if a ghost block reaches
--   the DB in future, its block_end can never extend a session's last_sample_at
--   past the session's real ended_at + 30 minutes.
-- =============================================================================

-- ── Part A: Delete ghost blocks ──────────────────────────────────────────────
DELETE FROM public.block_records
WHERE EXTRACT(EPOCH FROM (block_end - block_start)) > 3600  -- duration > 1 hour
  AND active_seconds <= 10;                                  -- but near-zero activity

-- ── Part B: Harden get_sessions_activity_stats ───────────────────────────────
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
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  WITH requested_sessions AS (
    SELECT DISTINCT unnest(p_session_ids::uuid[]) AS sess_id
  ),
  -- Pull sessions so we can bound last_sample_at by ended_at
  session_bounds AS (
    SELECT id, COALESCE(ended_at, now()) AS ended_at
    FROM public.sessions
    WHERE id = ANY(p_session_ids::uuid[])
  ),
  -- 1. Aggregate from block_records (single source of truth).
  --    Each block duration is capped at 600 s (10 min).
  --    last_sample_at is additionally capped at session ended_at + 30 min so
  --    that a ghost block with a blown-out block_end cannot poison effectiveEndMs
  --    in Timesheets.tsx and generate phantom "12:00 am – X:XX am" rows.
  block_stats AS (
    SELECT
      br.session_id AS b_session_id,
      COALESCE(ROUND(SUM(
        LEAST(EXTRACT(EPOCH FROM (br.block_end - br.block_start)), 600)
      ) FILTER (WHERE br.credited = true) / 60), 0)::numeric         AS duration_mins,
      COUNT(*) FILTER (WHERE br.credited = true)::bigint              AS sample_count,
      COALESCE(SUM(br.activity_percent)  FILTER (WHERE br.credited = true), 0)::numeric AS activity_sum,
      COALESCE(AVG(br.activity_percent)  FILTER (WHERE br.credited = true), 0)::numeric AS activity_percent,
      -- Cap last_sample_at: never more than 30 min past the session's real ended_at
      LEAST(
        MAX(br.block_end),
        COALESCE(
          (SELECT sb.ended_at + INTERVAL '30 minutes'
             FROM session_bounds sb
            WHERE sb.id = br.session_id),
          MAX(br.block_end)
        )
      )                                                               AS last_sample_at,
      COUNT(*) FILTER (WHERE br.is_offline = true)::bigint            AS offline_count,
      COUNT(*) FILTER (WHERE br.credited = true AND br.activity_percent > 0)::bigint AS active_count
    FROM public.block_records br
    WHERE br.session_id = ANY(p_session_ids::uuid[])
    GROUP BY br.session_id
  ),
  -- 2. Fallback: activity_samples for brand-new live sessions (<10 min, no blocks yet)
  sample_stats AS (
    SELECT
      a.session_id AS s_session_id,
      COUNT(DISTINCT date_trunc('minute', a.recorded_at))::numeric    AS duration_mins,
      COUNT(DISTINCT date_trunc('minute', a.recorded_at))::bigint     AS sample_count,
      COALESCE(SUM(a.activity_percent), 0)::numeric                  AS activity_sum,
      COALESCE(AVG(a.activity_percent), 0)::numeric                  AS activity_percent,
      MAX(a.recorded_at)                                             AS last_sample_at,
      COUNT(*) FILTER (WHERE a.is_offline = true)::bigint            AS offline_count,
      COUNT(*) FILTER (WHERE a.idle = false)::bigint                 AS active_count
    FROM public.activity_samples a
    WHERE a.session_id = ANY(p_session_ids::uuid[])
      AND a.session_id NOT IN (SELECT bs_sub.b_session_id FROM block_stats bs_sub)
    GROUP BY a.session_id
  )
  SELECT
    rs.sess_id                                                        AS session_id,
    COALESCE(bs.duration_mins, ss.duration_mins, 0)::numeric         AS duration_mins,
    COALESCE(bs.sample_count,  ss.sample_count,  0)::bigint          AS sample_count,
    COALESCE(bs.activity_sum,  ss.activity_sum,  0)::numeric         AS activity_sum,
    COALESCE(bs.activity_percent, ss.activity_percent, 0)::numeric   AS activity_percent,
    COALESCE(bs.last_sample_at, ss.last_sample_at, NULL)::timestamptz AS last_sample_at,
    COALESCE(bs.offline_count, ss.offline_count, 0)::bigint          AS offline_count,
    COALESCE(bs.active_count,  ss.active_count,  0)::bigint          AS active_count
  FROM requested_sessions rs
  LEFT JOIN block_stats bs ON rs.sess_id = bs.b_session_id
  LEFT JOIN sample_stats ss ON rs.sess_id = ss.s_session_id
  WHERE bs.b_session_id IS NOT NULL OR ss.s_session_id IS NOT NULL;
$function$;

COMMENT ON FUNCTION public.get_sessions_activity_stats IS
  'Per-session totals for Timesheets and Activity pages. Uses block_records as the
   authoritative primary source with per-minute activity_samples fallback for live
   sessions under 10 minutes. last_sample_at is capped at session ended_at + 30 min
   to prevent ghost blocks from causing phantom Timesheet entries.';

NOTIFY pgrst, 'reload schema';
