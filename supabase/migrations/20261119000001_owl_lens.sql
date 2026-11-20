-- Migration: 20261119000001_owl_lens.sql
--
-- Owl Lens: a feed that shows a manager only what is out of the ordinary.
--
-- A background job (every 10 minutes) compares each person's day with their
-- own normal and writes a "highlight" for anything that stands out. Managers
-- read the feed and acknowledge, dismiss or mark a highlight as expected.
--
-- Pieces:
--   owl_lens_highlights      one row per person, per kind, per day
--   owl_lens_org_state       when the job last ran for an organisation
--   owl_lens_can_view()      who may see a highlight (used by RLS)
--   owl_lens_set_status()    the only way a client changes a highlight
--   owl_lens_detect()        works out the highlights for one org and day
--   owl_lens_evaluate()      saves them (one card per person/kind/day)
--   owl_lens_run()           the job: every premium org, today in its time zone
--   owl_lens_end_trial()     ends the quiet trial early (Owners and Admins)
--
-- Quiet trial: for 14 days after Owl Lens first runs for an organisation,
-- only Owners and Admins see it, so the cards can be checked and the limits
-- adjusted before managers rely on them.
--
-- Days are the organisation's days (settings.orgTimezone), the same boundary
-- block_records.business_date already uses.
--
-- What is deliberately NOT here, because TrackOwl does not record it:
--   productive / unproductive app labels, app categories, shift times,
--   key timing (rhythm), mouse movement as its own number, switches inside
--   a minute. See Owl-Lens-Highlights-Plan.pdf, section 5.

-- ---------------------------------------------------------------- tables

CREATE TABLE IF NOT EXISTS public.owl_lens_highlights (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id        uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  business_date    date NOT NULL,
  kind             text NOT NULL CHECK (kind IN
                     ('not_started','long_day','idle','low_input','input_pattern','app_mix','focus')),
  severity         text NOT NULL CHECK (severity IN ('critical','warning','info','positive')),
  detail           text NOT NULL,
  evidence         jsonb NOT NULL DEFAULT '{}'::jsonb,
  baseline_source  text NOT NULL DEFAULT 'personal'
                     CHECK (baseline_source IN ('personal','team','organization','rule')),
  window_start     timestamptz,
  window_end       timestamptz,
  -- 'resolved' is set by the job when the condition no longer holds;
  -- the other three are set by a manager and the job never overrides them.
  status           text NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','resolved','acknowledged','dismissed','expected')),
  status_reason    text,
  status_by        uuid REFERENCES public.members(id) ON DELETE SET NULL,
  status_at        timestamptz,
  detected_at      timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, member_id, kind, business_date)
);

CREATE INDEX IF NOT EXISTS idx_owl_lens_org_date
  ON public.owl_lens_highlights (organization_id, business_date, status);

CREATE TABLE IF NOT EXISTS public.owl_lens_org_state (
  organization_id  uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  last_run_at      timestamptz,
  last_error       text,
  last_error_at    timestamptz,
  -- Until this moment only Owners and Admins see Owl Lens. Set on the first run.
  trial_until      timestamptz
);

ALTER TABLE public.owl_lens_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owl_lens_org_state  ENABLE ROW LEVEL SECURITY;

-- Clients read only. Every write goes through owl_lens_set_status() or the job.
REVOKE ALL ON public.owl_lens_highlights FROM anon, authenticated;
REVOKE ALL ON public.owl_lens_org_state  FROM anon, authenticated;
GRANT SELECT ON public.owl_lens_highlights TO authenticated;
GRANT SELECT ON public.owl_lens_org_state  TO authenticated;

-- ---------------------------------------------------------------- access

-- The caller's member row in this organisation (a person can belong to more
-- than one, so this is checked per organisation, not with get_my_org_id()).
CREATE OR REPLACE FUNCTION public.owl_lens_me(p_org uuid)
RETURNS TABLE (member_id uuid, role text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT m.id, m.role
  FROM public.members m
  WHERE m.organization_id = p_org
    AND coalesce(m.status, '') <> 'Deleted'
    AND auth.uid() IS NOT NULL
    AND (m.auth_user_id = auth.uid()
         OR lower(m.email) = lower(auth.jwt() ->> 'email'))
  ORDER BY (m.auth_user_id = auth.uid()) DESC NULLS LAST
  LIMIT 1
$$;

-- Owners and Admins: everything.
-- Viewers: everyone, except unusual-input highlights.
-- Managers: themselves and the teams they manage or lead (the same rule the
--   portal uses in AuthContext), except unusual-input highlights.
-- Unusual input is the most sensitive card, so until the business decides
-- otherwise only Owners and Admins see it.
CREATE OR REPLACE FUNCTION public.owl_lens_can_view(p_org uuid, p_member uuid, p_kind text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_me   uuid;
  v_role text;
BEGIN
  SELECT me.member_id, me.role INTO v_me, v_role FROM public.owl_lens_me(p_org) me;
  IF v_me IS NULL THEN RETURN false; END IF;
  IF v_role IN ('Owner', 'Admin') THEN RETURN true; END IF;
  IF p_kind = 'input_pattern' THEN RETURN false; END IF;
  IF v_role = 'Viewer' THEN RETURN true; END IF;
  IF v_role = 'Manager' THEN
    RETURN p_member = v_me OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.member_id = p_member
        AND tm.team_id IN (
          SELECT t.id FROM public.teams t
          WHERE t.manager_id = v_me AND t.organization_id = p_org
          UNION
          SELECT tl.team_id FROM public.team_members tl
          WHERE tl.member_id = v_me AND tl.is_lead
        )
    );
  END IF;
  RETURN false;
END;
$$;

DROP POLICY IF EXISTS owl_lens_highlights_read ON public.owl_lens_highlights;
CREATE POLICY owl_lens_highlights_read ON public.owl_lens_highlights
  FOR SELECT TO authenticated
  USING (public.owl_lens_can_view(organization_id, member_id, kind));

DROP POLICY IF EXISTS owl_lens_org_state_read ON public.owl_lens_org_state;
CREATE POLICY owl_lens_org_state_read ON public.owl_lens_org_state
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.owl_lens_me(organization_id)));

-- Acknowledge, dismiss, mark as expected, or put back ('active').
CREATE OR REPLACE FUNCTION public.owl_lens_set_status(p_id uuid, p_status text, p_reason text DEFAULT NULL)
RETURNS public.owl_lens_highlights
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_h    public.owl_lens_highlights;
  v_me   uuid;
  v_role text;
BEGIN
  IF p_status NOT IN ('active', 'acknowledged', 'dismissed', 'expected') THEN
    RAISE EXCEPTION 'Unknown status: %', p_status;
  END IF;

  SELECT * INTO v_h FROM public.owl_lens_highlights WHERE id = p_id;
  IF v_h.id IS NULL OR NOT public.owl_lens_can_view(v_h.organization_id, v_h.member_id, v_h.kind) THEN
    RAISE EXCEPTION 'Highlight not found';
  END IF;

  SELECT me.member_id, me.role INTO v_me, v_role FROM public.owl_lens_me(v_h.organization_id) me;
  IF v_role IS NULL OR v_role NOT IN ('Owner', 'Admin', 'Manager') THEN
    RAISE EXCEPTION 'Only owners, admins and managers can review highlights';
  END IF;

  UPDATE public.owl_lens_highlights
     SET status        = p_status,
         status_reason = CASE WHEN p_status = 'expected'
                              THEN left(nullif(trim(p_reason), ''), 120) END,
         status_by     = CASE WHEN p_status = 'active' THEN NULL ELSE v_me END,
         status_at     = CASE WHEN p_status = 'active' THEN NULL ELSE now() END,
         updated_at    = now()
   WHERE id = p_id
  RETURNING * INTO v_h;

  RETURN v_h;
END;
$$;

-- ---------------------------------------------------------------- wording helpers

CREATE OR REPLACE FUNCTION public.owl_lens_fmt_mins(p_mins numeric)
RETURNS text LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_mins IS NULL THEN NULL
    WHEN round(p_mins) < 60 THEN round(p_mins)::int || ' min'
    WHEN round(p_mins)::int % 60 = 0 THEN (round(p_mins)::int / 60) || ' h'
    ELSE (round(p_mins)::int / 60) || ' h ' || (round(p_mins)::int % 60) || ' min'
  END
$$;

CREATE OR REPLACE FUNCTION public.owl_lens_fmt_time(p_ts timestamptz, p_tz text)
RETURNS text LANGUAGE sql STABLE
AS $$
  SELECT lower(to_char(p_ts AT TIME ZONE p_tz, 'FMHH12:MI AM'))
$$;

-- Minutes after midnight -> "9:10 am"
CREATE OR REPLACE FUNCTION public.owl_lens_fmt_clock(p_min numeric)
RETURNS text LANGUAGE sql IMMUTABLE
AS $$
  SELECT lower(to_char(timestamp '2000-01-01' + make_interval(mins => round(p_min)::int), 'FMHH12:MI AM'))
$$;

-- ---------------------------------------------------------------- detection

-- Works out every highlight for one organisation and one of its days.
-- Read-only; owl_lens_evaluate() saves the result.
--
-- "Normal" is the person's own last 28 days that had at least 30 minutes of
-- tracked time. With fewer than 7 such days the team's normal is used, or
-- the organisation's when they are in no team, and the card says so.
CREATE OR REPLACE FUNCTION public.owl_lens_detect(p_org uuid, p_date date)
RETURNS TABLE (
  member_id       uuid,
  kind            text,
  severity        text,
  detail          text,
  evidence        jsonb,
  baseline_source text,
  window_start    timestamptz,
  window_end      timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
WITH
cfg AS (
  SELECT o.id AS org, z.tz,
         (p_date::timestamp AT TIME ZONE z.tz)       AS day_start,
         ((p_date + 1)::timestamp AT TIME ZONE z.tz) AS day_end,
         least(now(), ((p_date + 1)::timestamp AT TIME ZONE z.tz)) AS eval_end,
         (p_date < (now() AT TIME ZONE z.tz)::date)  AS is_past,
         CASE WHEN coalesce(o.settings ->> 'autoStopOnIdle', 'false') = 'true'
               AND (o.settings ->> 'idleAutoStopMinutes') ~ '^\d+$'
              THEN (o.settings ->> 'idleAutoStopMinutes')::int END AS idle_stop_mins
  FROM public.organizations o
  CROSS JOIN LATERAL (
    SELECT CASE WHEN EXISTS (SELECT 1 FROM pg_timezone_names n WHERE n.name = o.settings ->> 'orgTimezone')
                THEN o.settings ->> 'orgTimezone' ELSE 'UTC' END AS tz
  ) z
  WHERE o.id = p_org
    AND p_date <= (now() AT TIME ZONE z.tz)::date
),
-- Anyone a manager marked as expected today is left alone for the rest of it.
mem AS (
  SELECT m.id, m.work_days, m.daily_limit, m.hire_date, m.termination_date
  FROM public.members m
  CROSS JOIN cfg
  WHERE m.organization_id = p_org
    AND m.status = 'Active'
    AND coalesce(m.tracking_enabled, true)
    AND NOT EXISTS (
      SELECT 1 FROM public.owl_lens_highlights q
      WHERE q.organization_id = p_org AND q.member_id = m.id
        AND q.business_date = p_date AND q.status = 'expected')
),

-- ------------------------------------------------ history (the 28 days before)
hb AS (
  SELECT b.user_id, b.business_date, b.block_start, b.block_end,
         coalesce(b.active_seconds, 0) AS act, coalesce(b.credited, false) AS credited,
         nullif(trim(b.app_name), '') AS app_name
  FROM public.block_records b
  WHERE b.organization_id = p_org
    AND b.business_date >= p_date - 28 AND b.business_date < p_date
    AND b.user_id IN (SELECT id FROM mem)
),
-- First timer start of each day. Sessions, not blocks, so a night that runs
-- past midnight does not count as "starting" at 12:00 am.
hs AS (
  SELECT s.user_id, (s.started_at AT TIME ZONE c.tz)::date AS d, min(s.started_at) AS first_start
  FROM public.sessions s CROSS JOIN cfg c
  WHERE s.organization_id = p_org
    AND coalesce(s.manual, false) = false
    AND s.started_at >= c.day_start - interval '29 days' AND s.started_at < c.day_start
    AND s.user_id IN (SELECT id FROM mem)
  GROUP BY 1, 2
),
hruns AS (
  SELECT y.user_id, y.business_date,
         extract(epoch FROM max(y.block_end) - min(y.block_start)) / 60.0 AS mins
  FROM (
    SELECT x.*, sum(x.brk) OVER (PARTITION BY x.user_id ORDER BY x.block_start) AS grp
    FROM (
      SELECT h.*,
             CASE WHEN lag(h.business_date) OVER w = h.business_date
                   AND h.block_start - lag(h.block_end) OVER w <= interval '120 seconds'
                  THEN 0 ELSE 1 END AS brk
      FROM hb h
      WHERE h.credited AND h.act >= 240   -- 4+ active minutes in the 10
      WINDOW w AS (PARTITION BY h.user_id ORDER BY h.block_start)
    ) x
  ) y
  GROUP BY y.user_id, y.business_date, y.grp
),
hd AS (
  SELECT h.user_id, h.business_date,
         sum(least(extract(epoch FROM h.block_end - h.block_start), 720)) FILTER (WHERE h.credited) / 60.0 AS tracked_mins,
         count(*) FILTER (WHERE h.credited)              AS n_blocks,
         count(*) FILTER (WHERE h.credited AND h.act = 0) AS idle_blocks
  FROM hb h
  GROUP BY 1, 2
),
hd2 AS (
  SELECT d.*,
         (SELECT extract(epoch FROM (s.first_start AT TIME ZONE c.tz)::time) / 60.0
            FROM hs s WHERE s.user_id = d.user_id AND s.d = d.business_date) AS start_min,
         (SELECT max(r.mins) FROM hruns r
            WHERE r.user_id = d.user_id AND r.business_date = d.business_date) AS longest_run
  FROM hd d CROSS JOIN cfg c
  WHERE d.tracked_mins >= 30
),
base AS (
  SELECT user_id, count(*) AS days,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY tracked_mins)::numeric AS usual_mins,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY start_min)::numeric    AS usual_start,
         sum(idle_blocks)::numeric / nullif(sum(n_blocks), 0)      AS usual_idle,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY longest_run)::numeric  AS usual_run,
         count(*) FILTER (WHERE extract(isodow FROM business_date) = extract(isodow FROM p_date)) AS same_weekday,
         max(business_date) AS last_worked
  FROM hd2
  GROUP BY user_id
),
mature AS (SELECT * FROM base WHERE days >= 7),
org_peer AS (
  SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY usual_start)::numeric AS usual_start,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY usual_mins)::numeric  AS usual_mins,
         avg(usual_idle) AS usual_idle
  FROM mature
),
peers AS (
  SELECT DISTINCT t1.member_id, t2.member_id AS peer_id
  FROM public.team_members t1
  JOIN public.team_members t2 ON t2.team_id = t1.team_id AND t2.member_id <> t1.member_id
  WHERE t1.member_id IN (SELECT id FROM mem)
),
team_peer AS (
  SELECT p.member_id,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY b.usual_start)::numeric AS usual_start,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY b.usual_mins)::numeric  AS usual_mins,
         avg(b.usual_idle) AS usual_idle
  FROM peers p JOIN mature b ON b.user_id = p.peer_id
  GROUP BY p.member_id
),
eff AS (
  SELECT m.id,
         coalesce(b.days, 0) AS days,
         CASE WHEN b.days >= 7 THEN 'personal'
              WHEN tp.member_id IS NOT NULL THEN 'team'
              ELSE 'organization' END AS src,
         CASE WHEN b.days >= 7 THEN b.usual_start
              WHEN tp.member_id IS NOT NULL THEN tp.usual_start
              ELSE op.usual_start END AS usual_start,
         CASE WHEN b.days >= 7 THEN b.usual_mins
              WHEN tp.member_id IS NOT NULL THEN tp.usual_mins
              ELSE op.usual_mins END AS usual_mins,
         CASE WHEN b.days >= 7 THEN b.usual_idle
              WHEN tp.member_id IS NOT NULL THEN tp.usual_idle
              ELSE op.usual_idle END AS usual_idle,
         CASE WHEN b.days >= 7 THEN b.usual_run END AS usual_run,
         coalesce(b.same_weekday, 0) AS same_weekday,
         b.last_worked
  FROM mem m
  LEFT JOIN base b ON b.user_id = m.id
  LEFT JOIN team_peer tp ON tp.member_id = m.id
  CROSS JOIN org_peer op
),

-- ------------------------------------------------ the day itself
tb AS (
  SELECT b.user_id, b.block_start, b.block_end,
         coalesce(b.active_seconds, 0) AS act, coalesce(b.credited, false) AS credited,
         nullif(trim(b.app_name), '') AS app_name
  FROM public.block_records b
  WHERE b.organization_id = p_org AND b.business_date = p_date
    AND b.user_id IN (SELECT id FROM mem)
),
td AS (
  SELECT user_id,
         sum(least(extract(epoch FROM block_end - block_start), 720)) FILTER (WHERE credited) / 60.0 AS tracked_mins,
         count(*) FILTER (WHERE credited)             AS n_blocks,
         count(*) FILTER (WHERE credited AND act = 0) AS idle_blocks,
         min(block_start) AS first_block,
         max(block_end)   AS last_block
  FROM tb
  GROUP BY user_id
),
tgap AS (
  SELECT g.user_id, max(g.gap) / 60.0 AS longest_break_mins
  FROM (
    SELECT t.user_id,
           extract(epoch FROM t.block_start - lag(t.block_end) OVER (PARTITION BY t.user_id ORDER BY t.block_start)) AS gap
    FROM tb t WHERE t.credited
  ) g
  GROUP BY g.user_id
),
truns AS (
  SELECT y.user_id, min(y.block_start) AS st, max(y.block_end) AS en,
         extract(epoch FROM max(y.block_end) - min(y.block_start)) / 60.0 AS mins
  FROM (
    SELECT x.*, sum(x.brk) OVER (PARTITION BY x.user_id ORDER BY x.block_start) AS grp
    FROM (
      SELECT t.*,
             CASE WHEN t.block_start - lag(t.block_end) OVER (PARTITION BY t.user_id ORDER BY t.block_start) <= interval '120 seconds'
                  THEN 0 ELSE 1 END AS brk
      FROM tb t WHERE t.credited AND t.act >= 240
    ) x
  ) y
  GROUP BY y.user_id, y.grp
),
-- Once-a-minute samples for the day, for idle stretches and input patterns.
ts AS (
  SELECT s.user_id, a.recorded_at,
         (coalesce(a.idle, false) OR coalesce(a.active_seconds, 0) = 0) AS is_idle,
         coalesce(a.active_seconds, 0) AS act,
         coalesce(a.key_presses, 0)    AS keys,
         coalesce(a.mouse_clicks, 0)   AS clicks,
         coalesce(nullif(trim(a.app_name), ''), 'an unnamed app') AS app,
         coalesce(a.window_title, '') AS win
  FROM public.activity_samples a
  JOIN public.sessions s ON s.id = a.session_id
  CROSS JOIN cfg c
  WHERE a.organization_id = p_org
    AND a.recorded_at >= c.day_start AND a.recorded_at < c.day_end
    AND s.user_id IN (SELECT id FROM mem)
),
-- Each minute checked against each pattern. "k" must stay the same for a run
-- to continue (the same window, or the same app).
--   held_key   900+ keystrokes a minute: faster than anyone types. Measured:
--              normal minutes sit around 19, a held key around 1,960.
--   move_only  activity, but no keys, no clicks, same window
--   no_pause   activity in almost every second of the minute
--   low_input  timer running with only a trickle of activity, same app
ts_pat AS (
  SELECT t.user_id, t.recorded_at, v.pat, v.hit, v.k, t.keys, t.clicks, t.app
  FROM ts t
  CROSS JOIN LATERAL (VALUES
    ('idle',      t.is_idle,                                                    ''),
    ('held_key',  NOT t.is_idle AND t.keys >= 900,                              ''),
    ('move_only', NOT t.is_idle AND t.act >= 30 AND t.keys = 0 AND t.clicks = 0, t.win),
    ('no_pause',  NOT t.is_idle AND t.act >= 57 AND t.keys < 900,               ''),
    ('low_input', NOT t.is_idle AND t.act BETWEEN 1 AND 8 AND t.keys + t.clicks <= 3, t.app)
  ) AS v(pat, hit, k)
),
ts_brk AS (
  SELECT u.*,
         CASE WHEN u.hit AND lag(u.hit) OVER w AND lag(u.k) OVER w = u.k
               AND u.recorded_at - lag(u.recorded_at) OVER w <= interval '150 seconds'
              THEN 0 ELSE 1 END AS brk
  FROM ts_pat u
  WINDOW w AS (PARTITION BY u.user_id, u.pat ORDER BY u.recorded_at)
),
sruns AS (
  SELECT g.user_id, g.pat,
         min(g.recorded_at) AS st,
         max(g.recorded_at) + interval '1 minute' AS en,
         count(*) AS mins, sum(g.keys) AS keys, sum(g.clicks) AS clicks,
         mode() WITHIN GROUP (ORDER BY g.app) AS app
  FROM (SELECT b.*, sum(b.brk) OVER (PARTITION BY b.user_id, b.pat ORDER BY b.recorded_at) AS grp FROM ts_brk b) g
  WHERE g.hit
  GROUP BY g.user_id, g.pat, g.grp
),
srun_best AS (
  SELECT DISTINCT ON (user_id, pat) * FROM sruns ORDER BY user_id, pat, mins DESC
),

-- ------------------------------------------------ calendar facts
hol AS (
  SELECT EXISTS (
    SELECT 1 FROM public.holidays h
    WHERE h.organization_id = p_org
      AND (h.date = p_date
           OR (coalesce(h.is_recurring, false)
               AND extract(month FROM h.date) = extract(month FROM p_date)
               AND extract(day   FROM h.date) = extract(day   FROM p_date)))
  ) AS is_holiday
),
on_leave AS (
  SELECT DISTINCT r.member_id
  FROM public.time_off_requests r
  WHERE r.organization_id = p_org
    AND lower(coalesce(r.status, '')) = 'approved'
    AND p_date BETWEEN r.start_date AND r.end_date
),
-- Any timer that overlaps the day, including manual time and one still running.
tsess AS (
  SELECT DISTINCT s.user_id
  FROM public.sessions s CROSS JOIN cfg c
  WHERE s.organization_id = p_org
    AND s.started_at < c.day_end
    AND coalesce(s.ended_at, now()) > c.day_start
    AND s.user_id IN (SELECT id FROM mem)
),

-- ------------------------------------------------ B1. workday not started
r_not_started AS (
  SELECT m.id AS member_id, 'not_started'::text AS kind, 'warning'::text AS severity,
         CASE WHEN c.is_past THEN 'No time was recorded on this working day.'
              ELSE 'No time has reached TrackOwl yet today.' END
         || CASE
              WHEN ms.missed >= 2 THEN
                ' That makes ' || ms.missed || ' working days in a row without tracking; they last tracked on '
                || to_char(e.last_worked, 'FMDay FMDD Mon') || '.'
              ELSE
                CASE e.src WHEN 'personal' THEN ' They usually start around '
                           WHEN 'team'     THEN ' Their team usually starts around '
                           ELSE ' Most people here start around ' END
                || public.owl_lens_fmt_clock(e.usual_start)
                || CASE WHEN c.is_past THEN '.' ELSE ', and today is one of their working days.' END
            END AS detail,
         jsonb_build_object('usual_start_min', round(e.usual_start), 'grace_min', 60,
                            'missed_working_days', ms.missed, 'last_worked', e.last_worked,
                            'history_days', e.days) AS evidence,
         e.src AS baseline_source,
         NULL::timestamptz AS window_start, NULL::timestamptz AS window_end
  FROM mem m
  JOIN eff e ON e.id = m.id
  CROSS JOIN cfg c
  CROSS JOIN hol
  -- working days (their work days, not holidays) since they last tracked, today included
  CROSS JOIN LATERAL (
    SELECT count(*) AS missed
    FROM generate_series(e.last_worked + 1, p_date, interval '1 day') g(d)
    WHERE extract(isodow FROM g.d)::int = ANY (coalesce(nullif(m.work_days, '{}'), '{1,2,3,4,5}')::int[])
      AND NOT EXISTS (
        SELECT 1 FROM public.holidays h
        WHERE h.organization_id = p_org
          AND (h.date = g.d::date
               OR (coalesce(h.is_recurring, false)
                   AND extract(month FROM h.date) = extract(month FROM g.d)
                   AND extract(day   FROM h.date) = extract(day   FROM g.d))))
  ) ms
  WHERE e.days >= 3
    AND e.usual_start IS NOT NULL
    -- They really do work this weekday: tracked on at least 3 of the last 4.
    -- The work-days setting alone is not enough; many people work fewer days than it says.
    AND e.same_weekday >= 3
    AND NOT hol.is_holiday
    AND extract(isodow FROM p_date)::int = ANY (coalesce(nullif(m.work_days, '{}'), '{1,2,3,4,5}')::int[])
    AND NOT EXISTS (SELECT 1 FROM on_leave l WHERE l.member_id = m.id)
    AND (m.hire_date IS NULL OR m.hire_date <= p_date)
    AND (m.termination_date IS NULL OR m.termination_date >= p_date)
    AND NOT EXISTS (SELECT 1 FROM tsess s WHERE s.user_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM td d WHERE d.user_id = m.id)
    -- past their usual start plus an hour of grace
    AND c.eval_end >= ((p_date::timestamp + make_interval(mins => round(e.usual_start)::int + 60)) AT TIME ZONE c.tz)
),

-- ------------------------------------------------ B2. very long day
r_long_day AS (
  SELECT d.user_id AS member_id, 'long_day'::text AS kind,
         CASE WHEN d.tracked_mins >= 720
                OR (d.tracked_mins >= 600 AND coalesce(g.longest_break_mins, 0) < 30)
              THEN 'critical' ELSE 'warning' END AS severity,
         public.owl_lens_fmt_mins(d.tracked_mins)
         || CASE WHEN c.is_past THEN ' tracked, ' ELSE ' tracked so far today, ' END
         || CASE e.src WHEN 'personal' THEN 'against their usual ' || public.owl_lens_fmt_mins(e.usual_mins)
                       WHEN 'team'     THEN 'against ' || public.owl_lens_fmt_mins(e.usual_mins) || ' for their team'
                       ELSE 'against ' || public.owl_lens_fmt_mins(e.usual_mins) || ' for most people here' END
         || '.'
         || CASE WHEN coalesce(g.longest_break_mins, 0) < 1 THEN ' They took no break.'
                 ELSE ' Their longest break was ' || public.owl_lens_fmt_mins(g.longest_break_mins) || '.' END
         || CASE WHEN d.idle_blocks::numeric / nullif(d.n_blocks, 0) >= 0.5
                 THEN ' More than half of it had no keyboard or mouse activity, so a timer may have been left running.'
                 ELSE '' END
         || CASE WHEN coalesce(m.daily_limit, 0) > 0 AND d.tracked_mins > m.daily_limit * 60
                 THEN ' That is over their daily limit of ' || public.owl_lens_fmt_mins(m.daily_limit * 60) || '.'
                 ELSE '' END AS detail,
         jsonb_build_object('tracked_mins', round(d.tracked_mins), 'usual_mins', round(e.usual_mins),
                            'longest_break_mins', round(coalesce(g.longest_break_mins, 0)),
                            'idle_share', round(d.idle_blocks::numeric / nullif(d.n_blocks, 0), 2),
                            'history_days', e.days) AS evidence,
         e.src AS baseline_source,
         d.first_block AS window_start, d.last_block AS window_end
  FROM td d
  JOIN eff e ON e.id = d.user_id
  JOIN mem m ON m.id = d.user_id
  LEFT JOIN tgap g ON g.user_id = d.user_id
  CROSS JOIN cfg c
  WHERE e.usual_mins IS NOT NULL
    AND d.tracked_mins >= greatest(e.usual_mins * 1.5, e.usual_mins + 120, 540)
),

-- ------------------------------------------------ C1. long idle stretch
r_idle AS (
  SELECT DISTINCT ON (x.member_id)
         x.member_id, x.kind, x.severity, x.detail, x.evidence, x.baseline_source, x.window_start, x.window_end
  FROM (
    SELECT r.user_id AS member_id, 'idle'::text AS kind,
           CASE WHEN r.mins >= 90 THEN 'critical' ELSE 'warning' END AS severity,
           'Their timer ran for ' || public.owl_lens_fmt_mins(r.mins)
           || ' (' || public.owl_lens_fmt_time(r.st, c.tz) || ' to ' || public.owl_lens_fmt_time(r.en, c.tz)
           || ') with no keyboard or mouse activity.'
           || CASE WHEN c.idle_stop_mins IS NOT NULL AND r.mins > c.idle_stop_mins
                   THEN ' Your idle setting normally stops the timer after ' || c.idle_stop_mins
                        || ' min, so this is worth checking.'
                   ELSE '' END AS detail,
           jsonb_build_object('pattern', 'stretch', 'minutes', r.mins, 'idle_stop_mins', c.idle_stop_mins) AS evidence,
           'rule'::text AS baseline_source, r.st AS window_start, r.en AS window_end, 1 AS pri
    FROM srun_best r CROSS JOIN cfg c
    WHERE r.pat = 'idle' AND r.mins >= 45
    UNION ALL
    SELECT d.user_id, 'idle', 'warning',
           round(100 * d.idle_blocks::numeric / d.n_blocks) || '% of '
           || CASE WHEN c.is_past THEN 'the day''s' ELSE 'today''s' END
           || ' tracked time had no keyboard or mouse activity, against '
           || CASE e.src WHEN 'personal' THEN 'their usual ' WHEN 'team' THEN 'their team''s usual ' ELSE 'a usual ' END
           || round(100 * e.usual_idle) || '%.',
           jsonb_build_object('pattern', 'share', 'idle_share', round(d.idle_blocks::numeric / d.n_blocks, 2),
                              'usual_idle_share', round(e.usual_idle, 2), 'tracked_mins', round(d.tracked_mins)),
           e.src, d.first_block, d.last_block, 2
    FROM td d JOIN eff e ON e.id = d.user_id CROSS JOIN cfg c
    WHERE d.tracked_mins >= 120 AND d.n_blocks > 0 AND e.usual_idle IS NOT NULL
      AND d.idle_blocks::numeric / d.n_blocks >= greatest(e.usual_idle + 0.30, 0.40)
  ) x
  ORDER BY x.member_id, x.pri
),

-- ------------------------------------------------ C2. timer running, almost no input
r_low_input AS (
  SELECT r.user_id AS member_id, 'low_input'::text AS kind, 'warning'::text AS severity,
         'For ' || public.owl_lens_fmt_mins(r.mins)
         || ' (' || public.owl_lens_fmt_time(r.st, c.tz) || ' to ' || public.owl_lens_fmt_time(r.en, c.tz) || ') '
         || r.app || ' stayed in front with only a few seconds of keyboard or mouse activity each minute.' AS detail,
         jsonb_build_object('minutes', r.mins, 'app', r.app) AS evidence,
         'rule'::text AS baseline_source, r.st AS window_start, r.en AS window_end
  FROM srun_best r CROSS JOIN cfg c
  WHERE r.pat = 'low_input' AND r.mins >= 45
),

-- ------------------------------------------------ C3. unusual input pattern
r_input AS (
  SELECT DISTINCT ON (x.user_id)
         x.user_id AS member_id, 'input_pattern'::text AS kind, x.severity, x.detail,
         jsonb_build_object('pattern', x.pat, 'minutes', x.mins, 'keystrokes', x.keys,
                            'clicks', x.clicks, 'app', x.app) AS evidence,
         'rule'::text AS baseline_source, x.st AS window_start, x.en AS window_end
  FROM (
    SELECT r.*, c.tz,
           CASE WHEN r.pat = 'held_key' AND r.mins >= 60 THEN 'critical' ELSE 'warning' END AS severity,
           CASE r.pat
             WHEN 'held_key' THEN
               to_char(r.keys, 'FM999,999,999') || ' keystrokes were recorded in '
               || public.owl_lens_fmt_mins(r.mins)
               || ' (' || public.owl_lens_fmt_time(r.st, c.tz) || ' to ' || public.owl_lens_fmt_time(r.en, c.tz)
               || ') in ' || r.app || ', about ' || to_char(round(r.keys::numeric / r.mins), 'FM999,999')
               || ' a minute, with '
               || CASE WHEN r.clicks = 0 THEN 'no mouse clicks'
                       ELSE to_char(r.clicks, 'FM999,999') || ' mouse clicks' END
               || '. That is faster than anyone can type, which usually means a key is being held down.'
             WHEN 'move_only' THEN
               'For ' || public.owl_lens_fmt_mins(r.mins)
               || ' (' || public.owl_lens_fmt_time(r.st, c.tz) || ' to ' || public.owl_lens_fmt_time(r.en, c.tz)
               || ') there was activity every minute in ' || r.app
               || ' but no keystrokes, no clicks and no change of window. Movement with nothing else for this long is unusual.'
             ELSE
               'Activity was recorded in almost every second for ' || public.owl_lens_fmt_mins(r.mins)
               || ' (' || public.owl_lens_fmt_time(r.st, c.tz) || ' to ' || public.owl_lens_fmt_time(r.en, c.tz)
               || '), without the short pauses people normally take.'
           END AS detail,
           CASE r.pat WHEN 'held_key' THEN 1 WHEN 'move_only' THEN 2 ELSE 3 END AS pri
    FROM srun_best r CROSS JOIN cfg c
    WHERE (r.pat = 'held_key'  AND r.mins >= 20)
       OR (r.pat = 'move_only' AND r.mins >= 60)
       OR (r.pat = 'no_pause'  AND r.mins >= 120)
  ) x
  ORDER BY x.user_id, (x.severity = 'critical') DESC, x.pri, x.mins DESC
),

-- ------------------------------------------------ A2. unusual app mix
-- Names the apps; never calls them good or bad (TrackOwl has no such labels).
happ AS (
  SELECT h.user_id, lower(h.app_name) AS app, count(*) AS n
  FROM hb h
  WHERE h.credited AND h.app_name IS NOT NULL
    AND lower(h.app_name) NOT IN ('trackowl', 'program manager', 'lockapp', 'unknown')
  GROUP BY 1, 2
),
happ_share AS (
  SELECT user_id, app, n::numeric / sum(n) OVER (PARTITION BY user_id) AS share FROM happ
),
tapp AS (
  SELECT t.user_id, min(t.app_name) AS app_name, lower(t.app_name) AS app, count(*) AS n
  FROM tb t
  WHERE t.credited AND t.app_name IS NOT NULL
    AND lower(t.app_name) NOT IN ('trackowl', 'program manager', 'lockapp', 'unknown')
  GROUP BY t.user_id, lower(t.app_name)
),
tapp_flag AS (
  SELECT t.*, coalesce(hs.share, 0) AS usual_share,
         coalesce(hs.share, 0) < 0.05 AS unfamiliar,
         sum(t.n) OVER (PARTITION BY t.user_id) AS total
  FROM tapp t
  LEFT JOIN happ_share hs ON hs.user_id = t.user_id AND hs.app = t.app
),
r_app_mix AS (
  SELECT f.user_id AS member_id, 'app_mix'::text AS kind, 'info'::text AS severity,
         round(100 * sum(f.n) FILTER (WHERE f.unfamiliar) / max(f.total)) || '% of '
         || CASE WHEN max(c.is_past::int) = 1 THEN 'the day' ELSE 'today' END
         || ' went on apps they rarely use: '
         || array_to_string((array_agg(f.app_name || ' (' || public.owl_lens_fmt_mins(f.n * 10) || ')'
                              ORDER BY f.n DESC) FILTER (WHERE f.unfamiliar))[1:3], ', ')
         || '.'
         || CASE WHEN coalesce(sum(f.usual_share) FILTER (WHERE f.unfamiliar), 0) < 0.01
                 THEN ' They have hardly used these in the last four weeks.'
                 ELSE ' Normally these make up about '
                      || round(100 * sum(f.usual_share) FILTER (WHERE f.unfamiliar)) || '% of their time.' END AS detail,
         jsonb_build_object('unfamiliar_share', round(sum(f.n) FILTER (WHERE f.unfamiliar)::numeric / max(f.total), 2),
                            'tracked_mins', round(max(d.tracked_mins))) AS evidence,
         'personal'::text AS baseline_source,
         min(d.first_block) AS window_start, max(d.last_block) AS window_end
  FROM tapp_flag f
  JOIN eff e ON e.id = f.user_id
  JOIN td d ON d.user_id = f.user_id
  CROSS JOIN cfg c
  WHERE e.src = 'personal' AND d.tracked_mins >= 90
  GROUP BY f.user_id
  HAVING sum(f.n) FILTER (WHERE f.unfamiliar)::numeric / max(f.total) >= 0.6
),

-- ------------------------------------------------ D. strong focus (positive)
r_focus AS (
  SELECT DISTINCT ON (r.user_id)
         r.user_id AS member_id, 'focus'::text AS kind, 'positive'::text AS severity,
         public.owl_lens_fmt_mins(r.mins) || ' of unbroken active work ('
         || public.owl_lens_fmt_time(r.st, c.tz) || ' to ' || public.owl_lens_fmt_time(r.en, c.tz)
         || '), longer than their usual best of ' || public.owl_lens_fmt_mins(e.usual_run) || '.' AS detail,
         jsonb_build_object('minutes', round(r.mins), 'usual_run_mins', round(e.usual_run)) AS evidence,
         'personal'::text AS baseline_source, r.st AS window_start, r.en AS window_end
  FROM truns r
  JOIN eff e ON e.id = r.user_id
  CROSS JOIN cfg c
  WHERE e.src = 'personal' AND e.usual_run IS NOT NULL
    AND r.mins >= greatest(150, e.usual_run * 1.5)
    -- a held key also counts as "active", so never praise that
    AND NOT EXISTS (SELECT 1 FROM r_input i WHERE i.member_id = r.user_id)
  ORDER BY r.user_id, r.mins DESC
)

SELECT * FROM r_not_started
UNION ALL SELECT * FROM r_long_day
UNION ALL SELECT * FROM r_idle
UNION ALL SELECT * FROM r_low_input
UNION ALL SELECT * FROM r_input
UNION ALL SELECT * FROM r_app_mix
UNION ALL SELECT * FROM r_focus
$$;

-- ---------------------------------------------------------------- saving

-- One card per person, per kind, per day. A card that is found again is
-- updated in place. A card a manager reviewed keeps its status. An active
-- card whose condition has gone away (for example, they have now started)
-- becomes 'resolved' and leaves the feed; it comes back if the condition does.
CREATE OR REPLACE FUNCTION public.owl_lens_evaluate(p_org uuid, p_date date)
RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  DROP TABLE IF EXISTS pg_temp.owl_lens_found;
  CREATE TEMP TABLE owl_lens_found AS
    SELECT * FROM public.owl_lens_detect(p_org, p_date);

  INSERT INTO public.owl_lens_highlights AS h
    (organization_id, member_id, business_date, kind, severity, detail, evidence,
     baseline_source, window_start, window_end)
  SELECT p_org, f.member_id, p_date, f.kind, f.severity, f.detail, f.evidence,
         f.baseline_source, f.window_start, f.window_end
  FROM owl_lens_found f
  ON CONFLICT (organization_id, member_id, kind, business_date) DO UPDATE
    SET severity        = excluded.severity,
        detail          = excluded.detail,
        evidence        = excluded.evidence,
        baseline_source = excluded.baseline_source,
        window_start    = excluded.window_start,
        window_end      = excluded.window_end,
        status          = CASE WHEN h.status = 'resolved' THEN 'active' ELSE h.status END,
        updated_at      = CASE WHEN h.status = 'resolved'
                                 OR h.detail   IS DISTINCT FROM excluded.detail
                                 OR h.severity IS DISTINCT FROM excluded.severity
                               THEN now() ELSE h.updated_at END;

  UPDATE public.owl_lens_highlights h
     SET status = 'resolved', updated_at = now()
   WHERE h.organization_id = p_org
     AND h.business_date = p_date
     AND h.status = 'active'
     AND NOT EXISTS (SELECT 1 FROM owl_lens_found f
                      WHERE f.member_id = h.member_id AND f.kind = h.kind)
     -- someone marked as expected is not evaluated, so their cards stay as they are
     AND NOT EXISTS (SELECT 1 FROM public.owl_lens_highlights x
                      WHERE x.organization_id = p_org AND x.member_id = h.member_id
                        AND x.business_date = p_date AND x.status = 'expected');

  SELECT count(*) INTO v_count FROM owl_lens_found;
  DROP TABLE IF EXISTS pg_temp.owl_lens_found;
  RETURN v_count;
END;
$$;

-- The job. Every premium organisation that has tracked in the last 30 days,
-- for today in its own time zone. Just after midnight it also finishes off
-- yesterday, because the last blocks of the day can arrive a little late.
-- One organisation failing does not stop the others; the error is kept.
CREATE OR REPLACE FUNCTION public.owl_lens_run()
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  o       record;
  v_tz    text;
  v_local timestamp;
BEGIN
  FOR o IN
    SELECT org.id, org.settings
    FROM public.organizations org
    WHERE public.is_premium_org(org.id)
      AND EXISTS (SELECT 1 FROM public.block_records b
                   WHERE b.organization_id = org.id
                     AND b.business_date >= current_date - 30)
  LOOP
    BEGIN
      v_tz := CASE WHEN EXISTS (SELECT 1 FROM pg_timezone_names n WHERE n.name = o.settings ->> 'orgTimezone')
                   THEN o.settings ->> 'orgTimezone' ELSE 'UTC' END;
      v_local := now() AT TIME ZONE v_tz;

      PERFORM public.owl_lens_evaluate(o.id, v_local::date);
      IF v_local::time < time '02:00' THEN
        PERFORM public.owl_lens_evaluate(o.id, v_local::date - 1);
      END IF;

      -- The first row for an organisation starts its 14-day quiet trial; later runs keep it.
      INSERT INTO public.owl_lens_org_state (organization_id, last_run_at, last_error, last_error_at, trial_until)
      VALUES (o.id, now(), NULL, NULL, NULL)
      ON CONFLICT (organization_id) DO UPDATE
        SET last_run_at = excluded.last_run_at, last_error = NULL, last_error_at = NULL;
    EXCEPTION WHEN others THEN
      INSERT INTO public.owl_lens_org_state (organization_id, last_error, last_error_at, trial_until)
      VALUES (o.id, SQLERRM, now(), NULL)
      ON CONFLICT (organization_id) DO UPDATE
        SET last_error = excluded.last_error, last_error_at = excluded.last_error_at;
    END;
  END LOOP;
END;
$$;

-- Ends the quiet trial now, so Managers and Viewers start seeing Owl Lens.
CREATE OR REPLACE FUNCTION public.owl_lens_end_trial(p_org uuid)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT me.role INTO v_role FROM public.owl_lens_me(p_org) me;
  IF v_role IS NULL OR v_role NOT IN ('Owner', 'Admin') THEN
    RAISE EXCEPTION 'Only owners and admins can end the Owl Lens trial';
  END IF;
  UPDATE public.owl_lens_org_state
     SET trial_until = now()
   WHERE organization_id = p_org AND trial_until > now();
END;
$$;

-- ---------------------------------------------------------------- permissions

-- Detection reads every organisation's raw activity, so clients must never
-- call it directly. Supabase grants new functions to anon/authenticated by
-- default, which is why these are revoked by name.
REVOKE ALL ON FUNCTION public.owl_lens_detect(uuid, date)   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.owl_lens_evaluate(uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.owl_lens_run()                FROM PUBLIC, anon, authenticated;
-- owl_lens_me() only ever returns the caller's own member row, and the
-- owl_lens_org_state read policy calls it as the caller, so it must stay callable.
REVOKE ALL ON FUNCTION public.owl_lens_me(uuid)             FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owl_lens_me(uuid)          TO authenticated;

REVOKE ALL ON FUNCTION public.owl_lens_can_view(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owl_lens_can_view(uuid, uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.owl_lens_set_status(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owl_lens_set_status(uuid, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.owl_lens_end_trial(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owl_lens_end_trial(uuid) TO authenticated;

-- ---------------------------------------------------------------- schedule

-- cron.schedule() with an existing name replaces that job, so this is safe to re-run.
SELECT cron.schedule('owl_lens_every_10_minutes', '*/10 * * * *', 'SELECT public.owl_lens_run();');
