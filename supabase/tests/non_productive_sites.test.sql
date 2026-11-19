-- Tests for 20261120000001_non_productive_sites.sql
--
-- Run after the migration, in the Supabase SQL editor (or psql) as the
-- postgres role. Everything happens inside one transaction that is rolled
-- back at the end, so no test data is left behind. It stops at the first
-- failure with "FAILED: <what>"; a clean run ends with "all passed".
--
-- Covers: built-in list with no setup, subdomains, admin add / remove / edit,
-- per-member override (and that it does not leak to others), 25% just below /
-- exactly at / above, the 1-hour minimum, several members in one alert,
-- org-timezone day boundaries, and that tracked time is not changed.

BEGIN;

CREATE FUNCTION pg_temp.ok(p_cond boolean, p_what text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF p_cond IS NOT TRUE THEN RAISE EXCEPTION 'FAILED: %', p_what; END IF;
  RAISE NOTICE 'ok: %', p_what;
END $$;

-- One member's day: p_blocks credited 10-minute blocks from p_from, one
-- sample a minute. The first p_np_mins minutes are on p_np_host, the rest on
-- docs.google.com.
CREATE FUNCTION pg_temp.day_of(p_org uuid, p_member uuid, p_date date, p_from timestamptz,
                               p_blocks int, p_np_mins int, p_np_host text) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  v_session uuid;
  i int;
  j int;
  v_start timestamptz;
BEGIN
  INSERT INTO public.sessions (user_id, organization_id, started_at)
  VALUES (p_member, p_org, p_from) RETURNING id INTO v_session;
  FOR i IN 0 .. p_blocks - 1 LOOP
    v_start := p_from + make_interval(mins => i * 10);
    INSERT INTO public.block_records
      (session_id, organization_id, user_id, business_date, block_start, block_end, active_seconds, credited)
    VALUES (v_session, p_org, p_member, p_date, v_start, v_start + interval '10 minutes', 600, true);
    FOR j IN 0 .. 9 LOOP
      INSERT INTO public.activity_samples
        (session_id, organization_id, recorded_at, domain, app_name, active_seconds, key_presses, mouse_clicks, idle)
      VALUES (v_session, p_org, v_start + make_interval(mins => j, secs => 5),
              CASE WHEN i * 10 + j < p_np_mins THEN p_np_host ELSE 'docs.google.com' END,
              'Google Chrome', 50, 20, 5, false);
    END LOOP;
  END LOOP;
END $$;

-- Who has a non_productive card for the day, and their share.
CREATE FUNCTION pg_temp.flagged(p_org uuid, p_date date) RETURNS text[]
LANGUAGE sql AS $$
  SELECT coalesce(array_agg(m.full_name ORDER BY m.full_name), '{}')
  FROM public.owl_lens_highlights h JOIN public.members m ON m.id = h.member_id
  WHERE h.organization_id = p_org AND h.business_date = p_date
    AND h.kind = 'non_productive' AND h.status = 'active'
$$;

DO $$
DECLARE
  v_org     uuid;
  v_day     date := date '2026-06-10';
  v_nine    timestamptz := (date '2026-06-10' + time '09:00') AT TIME ZONE 'America/Los_Angeles';
  a uuid; b uuid; c uuid; d uuid; e uuid; f uuid; g uuid; t uuid;
  v_tracked_before numeric;
  v_tracked_after  numeric;
  v_np int;
  v_detail text;
BEGIN
  INSERT INTO public.organizations (name, settings)
  VALUES ('np test org', '{"orgTimezone": "America/Los_Angeles"}'::jsonb)
  RETURNING id INTO v_org;

  INSERT INTO public.members (organization_id, email, full_name, role, status)
  VALUES (v_org, 'np-a@example.test', 'A below',        'User', 'Active') RETURNING id INTO a;
  INSERT INTO public.members (organization_id, email, full_name, role, status)
  VALUES (v_org, 'np-b@example.test', 'B exactly',      'User', 'Active') RETURNING id INTO b;
  INSERT INTO public.members (organization_id, email, full_name, role, status)
  VALUES (v_org, 'np-c@example.test', 'C above',        'User', 'Active') RETURNING id INTO c;
  INSERT INTO public.members (organization_id, email, full_name, role, status)
  VALUES (v_org, 'np-d@example.test', 'D short day',    'User', 'Active') RETURNING id INTO d;
  INSERT INTO public.members (organization_id, email, full_name, role, status)
  VALUES (v_org, 'np-e@example.test', 'E reddit',       'User', 'Active') RETURNING id INTO e;
  INSERT INTO public.members (organization_id, email, full_name, role, status)
  VALUES (v_org, 'np-f@example.test', 'F custom site',  'User', 'Active') RETURNING id INTO f;
  INSERT INTO public.members (organization_id, email, full_name, role, status)
  VALUES (v_org, 'np-g@example.test', 'G allowed',      'User', 'Active') RETURNING id INTO g;
  INSERT INTO public.members (organization_id, email, full_name, role, status)
  VALUES (v_org, 'np-t@example.test', 'T midnight',     'User', 'Active') RETURNING id INTO t;

  -- 120 minutes tracked each; the threshold is 30 minutes.
  PERFORM pg_temp.day_of(v_org, a, v_day, v_nine, 12, 29, 'www.youtube.com');
  PERFORM pg_temp.day_of(v_org, b, v_day, v_nine, 12, 30, 'www.youtube.com');
  PERFORM pg_temp.day_of(v_org, c, v_day, v_nine, 12, 31, 'm.youtube.com');
  -- 50 minutes tracked, all of it on YouTube: under the 1-hour minimum.
  PERFORM pg_temp.day_of(v_org, d, v_day, v_nine,  5, 50, 'www.youtube.com');
  PERFORM pg_temp.day_of(v_org, e, v_day, v_nine, 12, 60, 'www.reddit.com');
  -- kisskh.la is not on the built-in list.
  PERFORM pg_temp.day_of(v_org, f, v_day, v_nine, 12, 60, 'kisskh.la');
  PERFORM pg_temp.day_of(v_org, g, v_day, v_nine, 12, 60, 'www.youtube.com');

  -- Org midnight. 23:00-24:00 Los Angeles on the 10th is already the 11th in
  -- UTC, but the app files those blocks under the 10th (business_date). The
  -- next hour is the 11th. All of it is on YouTube.
  PERFORM pg_temp.day_of(v_org, t, v_day,     (v_day + time '23:00') AT TIME ZONE 'America/Los_Angeles', 6, 60, 'www.youtube.com');
  PERFORM pg_temp.day_of(v_org, t, v_day + 1, (v_day + 1)::timestamp AT TIME ZONE 'America/Los_Angeles',  6, 60, 'www.youtube.com');
  -- ...and 60 more minutes on the 10th, on work sites, so the 10th is 120 minutes with 60 on YouTube.
  PERFORM pg_temp.day_of(v_org, t, v_day, v_nine, 6, 0, 'docs.google.com');

  SELECT sum(least(extract(epoch FROM block_end - block_start), 720)) INTO v_tracked_before
  FROM public.block_records WHERE organization_id = v_org;

  -- ------------------------------------------------ built-in list, no setup
  PERFORM public.owl_lens_evaluate(v_org, v_day);

  PERFORM pg_temp.ok((SELECT count(*) FROM public.nonproductive_domain_rules WHERE organization_id = v_org) = 0,
                     'no admin setup: the organisation has no rules');
  PERFORM pg_temp.ok(
    pg_temp.flagged(v_org, v_day) = ARRAY['B exactly','C above','E reddit','G allowed','T midnight'],
    'built-in list: B, C, E, G and T flagged; A (just below), D (short day) and F (unlisted site) not');

  -- ------------------------------------------------ 25% threshold
  SELECT nonproductive_mins INTO v_np FROM public.nonproductive_day_summary(v_org, v_day) WHERE member_id = a;
  PERFORM pg_temp.ok(v_np = 29, '29 of 120 minutes counted for A (just below 25%)');
  SELECT nonproductive_mins INTO v_np FROM public.nonproductive_day_summary(v_org, v_day) WHERE member_id = b;
  PERFORM pg_temp.ok(v_np = 30, '30 of 120 minutes counted for B (exactly 25%)');
  SELECT nonproductive_mins INTO v_np FROM public.nonproductive_day_summary(v_org, v_day) WHERE member_id = c;
  PERFORM pg_temp.ok(v_np = 31, '31 of 120 minutes counted for C, on m.youtube.com (a subdomain)');

  SELECT detail INTO v_detail FROM public.owl_lens_highlights
   WHERE organization_id = v_org AND member_id = b AND business_date = v_day AND kind = 'non_productive';
  PERFORM pg_temp.ok(v_detail LIKE '%(25%)%' AND v_detail LIKE '%youtube.com%', 'B''s card says 25% and names youtube.com');

  -- ------------------------------------------------ several members in one alert
  PERFORM pg_temp.ok(
    (SELECT count(*) FROM public.owl_lens_highlights
      WHERE organization_id = v_org AND business_date = v_day AND kind = 'non_productive' AND status = 'active') = 5,
    'one card for each of the 5 members over the line, read together for the pop-up');

  -- ------------------------------------------------ org-timezone day boundary
  SELECT nonproductive_mins INTO v_np FROM public.nonproductive_day_summary(v_org, v_day) WHERE member_id = t;
  PERFORM pg_temp.ok(v_np = 60, 'T on the 10th: the 23:00-24:00 hour counts (Los Angeles day), the hour after midnight does not');
  PERFORM pg_temp.ok(
    (SELECT tracked_mins FROM public.nonproductive_day_summary(v_org, v_day) WHERE member_id = t) = 120,
    'T on the 10th: 120 minutes tracked');
  PERFORM public.owl_lens_evaluate(v_org, v_day + 1);
  SELECT nonproductive_mins INTO v_np FROM public.nonproductive_day_summary(v_org, v_day + 1) WHERE member_id = t;
  PERFORM pg_temp.ok(v_np = 60, 'T on the 11th: the hour after Los Angeles midnight counts there');
  PERFORM pg_temp.ok('T midnight' = ANY (pg_temp.flagged(v_org, v_day + 1)),
                     'T on the 11th: exactly 1 hour tracked meets the minimum, and all of it is YouTube');

  -- ------------------------------------------------ admin edits
  -- Remove a built-in site for the whole organisation.
  INSERT INTO public.nonproductive_domain_rules (organization_id, domain, is_nonproductive)
  VALUES (v_org, 'reddit.com', false);
  -- Add a site.
  INSERT INTO public.nonproductive_domain_rules (organization_id, domain, is_nonproductive)
  VALUES (v_org, 'kisskh.com', true);
  PERFORM public.owl_lens_evaluate(v_org, v_day);
  PERFORM pg_temp.ok(NOT ('E reddit' = ANY (pg_temp.flagged(v_org, v_day))), 'admin removed reddit.com: E no longer flagged');
  PERFORM pg_temp.ok(NOT ('F custom site' = ANY (pg_temp.flagged(v_org, v_day))), 'kisskh.com added, but F was on kisskh.la: still not flagged');

  -- Edit the added site (fix the typo).
  UPDATE public.nonproductive_domain_rules SET domain = 'kisskh.la'
   WHERE organization_id = v_org AND member_id IS NULL AND domain = 'kisskh.com';
  PERFORM public.owl_lens_evaluate(v_org, v_day);
  PERFORM pg_temp.ok('F custom site' = ANY (pg_temp.flagged(v_org, v_day)), 'admin edited it to kisskh.la: F flagged');

  -- A bad site name is refused.
  BEGIN
    INSERT INTO public.nonproductive_domain_rules (organization_id, domain, is_nonproductive)
    VALUES (v_org, 'https://YouTube.com/watch', true);
    RAISE EXCEPTION 'FAILED: a full URL was accepted as a site name';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'ok: a full URL is refused as a site name';
  END;

  -- ------------------------------------------------ per-member override
  INSERT INTO public.nonproductive_domain_rules (organization_id, member_id, domain, is_nonproductive)
  VALUES (v_org, g, 'youtube.com', false);
  -- And the other way: reddit.com back on for E only.
  INSERT INTO public.nonproductive_domain_rules (organization_id, member_id, domain, is_nonproductive)
  VALUES (v_org, e, 'reddit.com', true);
  PERFORM public.owl_lens_evaluate(v_org, v_day);
  PERFORM pg_temp.ok(NOT ('G allowed' = ANY (pg_temp.flagged(v_org, v_day))), 'YouTube allowed for G only: G not flagged');
  PERFORM pg_temp.ok('B exactly' = ANY (pg_temp.flagged(v_org, v_day)) AND 'C above' = ANY (pg_temp.flagged(v_org, v_day)),
                     'G''s override does not reach B or C');
  PERFORM pg_temp.ok('E reddit' = ANY (pg_temp.flagged(v_org, v_day)), 'reddit.com back on for E only: E flagged again');

  -- The same member rule twice is refused.
  BEGIN
    INSERT INTO public.nonproductive_domain_rules (organization_id, member_id, domain, is_nonproductive)
    VALUES (v_org, g, 'youtube.com', true);
    RAISE EXCEPTION 'FAILED: a duplicate member rule was accepted';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'ok: a duplicate member rule is refused';
  END;

  -- ------------------------------------------------ tracked time untouched
  SELECT sum(least(extract(epoch FROM block_end - block_start), 720)) INTO v_tracked_after
  FROM public.block_records WHERE organization_id = v_org;
  PERFORM pg_temp.ok(v_tracked_before = v_tracked_after
                     AND NOT EXISTS (SELECT 1 FROM public.block_records WHERE organization_id = v_org AND NOT credited),
                     'tracked time and credited blocks are unchanged');

  RAISE NOTICE 'all passed';
END $$;

ROLLBACK;
