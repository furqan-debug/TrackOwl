-- Migration: 20261120000001_non_productive_sites.sql
--
-- Non-productive sites: time on social media, streaming, entertainment and
-- gaming sites is counted minute by minute, and Owl Lens raises a highlight
-- when it reaches a quarter of someone's tracked day.
--
-- Read-only on tracking. Nothing here changes block_records, sessions,
-- activity_samples, organizations.settings or anything the desktop app reads,
-- so tracked time and the app's tracking rules stay exactly as they are. The
-- minutes come from the sites the app already records (Apps & URLs).
--
-- Pieces:
--   nonproductive_default_domains   the built-in list, the same for everyone
--   nonproductive_domain_rules      an organisation's changes, and per-member changes on top
--   nonproductive_blocks            one row per tracked block with non-productive minutes in it
--   nonproductive_compute_blocks()  THE calculation (the only place it lives)
--   nonproductive_refresh()         saves it for one organisation day
--   nonproductive_day_summary()     per-member totals for a day, read by Owl Lens
--   owl_lens_detect_non_productive() the Owl Lens rule (25% of tracked time)
--   owl_lens_evaluate()             now also refreshes and saves the new rule
--
-- Days: block_records.business_date, which the app already sets in the
-- organisation's time zone. Nothing here works out a day boundary of its own.
--
-- Roll back: supabase/rollbacks/20261120000001_non_productive_sites.down.sql

-- ---------------------------------------------------------------- tables

-- A site name such as youtube.com. Lower case, no scheme, path or port.
-- A rule for a site also covers its subdomains (www.youtube.com, m.youtube.com).
CREATE TABLE IF NOT EXISTS public.nonproductive_default_domains (
  domain    text PRIMARY KEY
              CHECK (length(domain) <= 253
                     AND domain ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'),
  category  text NOT NULL CHECK (category IN ('social','video','music','gaming','entertainment'))
);

INSERT INTO public.nonproductive_default_domains (domain, category) VALUES
  -- social media
  ('facebook.com','social'), ('instagram.com','social'), ('tiktok.com','social'),
  ('x.com','social'), ('twitter.com','social'), ('reddit.com','social'),
  ('snapchat.com','social'), ('pinterest.com','social'), ('tumblr.com','social'),
  ('threads.net','social'), ('9gag.com','social'), ('discord.com','social'),
  -- video streaming
  ('youtube.com','video'), ('netflix.com','video'), ('primevideo.com','video'),
  ('hulu.com','video'), ('disneyplus.com','video'), ('max.com','video'),
  ('twitch.tv','video'), ('kick.com','video'), ('dailymotion.com','video'),
  ('crunchyroll.com','video'), ('peacocktv.com','video'), ('tv.apple.com','video'),
  -- music
  ('spotify.com','music'), ('soundcloud.com','music'), ('music.youtube.com','music'),
  -- gaming
  ('steampowered.com','gaming'), ('steamcommunity.com','gaming'), ('roblox.com','gaming'),
  ('epicgames.com','gaming'), ('poki.com','gaming'), ('miniclip.com','gaming'),
  ('chess.com','gaming'), ('crazygames.com','gaming'),
  -- entertainment
  ('imdb.com','entertainment'), ('buzzfeed.com','entertainment'), ('espn.com','entertainment'),
  ('bleacherreport.com','entertainment')
ON CONFLICT (domain) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.nonproductive_domain_rules (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- NULL: everyone in the organisation. Otherwise one member, on top of the organisation's list.
  member_id         uuid REFERENCES public.members(id) ON DELETE CASCADE,
  domain            text NOT NULL
                      CHECK (length(domain) <= 253
                             AND domain ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'),
  -- true: counts as non-productive. false: does not (switches a built-in site off).
  is_nonproductive  boolean NOT NULL,
  created_by        uuid REFERENCES public.members(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_nonproductive_domain_rules
  ON public.nonproductive_domain_rules (organization_id, member_id, domain) NULLS NOT DISTINCT;

-- One row per tracked (credited) block that had at least one minute on a
-- non-productive site. Kept apart from block_records on purpose: this is a
-- reading of the blocks, never a change to them. Rebuilt by the Owl Lens job,
-- so a change to the list shows up on its next run.
CREATE TABLE IF NOT EXISTS public.nonproductive_blocks (
  block_id               uuid PRIMARY KEY REFERENCES public.block_records(id) ON DELETE CASCADE,
  organization_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id              uuid NOT NULL,   -- block_records.user_id (members.id)
  business_date          date NOT NULL,
  block_start            timestamptz NOT NULL,
  block_end              timestamptz NOT NULL,
  nonproductive_minutes  smallint NOT NULL CHECK (nonproductive_minutes > 0),
  -- minutes per listed site, e.g. {"youtube.com": 6, "facebook.com": 2}
  domains                jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nonproductive_blocks_org_date
  ON public.nonproductive_blocks (organization_id, business_date, member_id);

-- ---------------------------------------------------------------- access

ALTER TABLE public.nonproductive_default_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nonproductive_domain_rules    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nonproductive_blocks          ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.nonproductive_default_domains FROM anon, authenticated;
REVOKE ALL ON public.nonproductive_domain_rules    FROM anon, authenticated;
REVOKE ALL ON public.nonproductive_blocks          FROM anon, authenticated;

-- The built-in list is the same for everyone and holds nothing private.
GRANT SELECT ON public.nonproductive_default_domains TO authenticated;
DROP POLICY IF EXISTS nonproductive_default_domains_read ON public.nonproductive_default_domains;
CREATE POLICY nonproductive_default_domains_read ON public.nonproductive_default_domains
  FOR SELECT TO authenticated USING (true);

-- Only Owners and Admins of the organisation read or change its rules, and a
-- per-member rule must name a member of that same organisation.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nonproductive_domain_rules TO authenticated;
DROP POLICY IF EXISTS nonproductive_domain_rules_admin ON public.nonproductive_domain_rules;
CREATE POLICY nonproductive_domain_rules_admin ON public.nonproductive_domain_rules
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.owl_lens_me(organization_id) me
                  WHERE me.role IN ('Owner', 'Admin')))
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.owl_lens_me(organization_id) me
             WHERE me.role IN ('Owner', 'Admin'))
    AND (nonproductive_domain_rules.member_id IS NULL OR EXISTS (
          SELECT 1 FROM public.members m
          WHERE m.id = nonproductive_domain_rules.member_id
            AND m.organization_id = nonproductive_domain_rules.organization_id))
  );

-- Who changed a rule and when is set here, not by the browser.
CREATE OR REPLACE FUNCTION public.nonproductive_domain_rules_stamp()
RETURNS trigger
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := now();
    NEW.created_by := (SELECT me.member_id FROM public.owl_lens_me(NEW.organization_id) me);
  ELSE
    NEW.created_at := OLD.created_at;
    NEW.created_by := OLD.created_by;
    NEW.organization_id := OLD.organization_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_nonproductive_domain_rules_stamp ON public.nonproductive_domain_rules;
CREATE TRIGGER trg_nonproductive_domain_rules_stamp
  BEFORE INSERT OR UPDATE ON public.nonproductive_domain_rules
  FOR EACH ROW EXECUTE FUNCTION public.nonproductive_domain_rules_stamp();

-- The saved minutes follow the same rule as the Owl Lens card: everyone except
-- the User and Client roles, Managers for their own teams only.
GRANT SELECT ON public.nonproductive_blocks TO authenticated;
DROP POLICY IF EXISTS nonproductive_blocks_read ON public.nonproductive_blocks;
CREATE POLICY nonproductive_blocks_read ON public.nonproductive_blocks
  FOR SELECT TO authenticated
  USING (public.owl_lens_can_view(organization_id, member_id, 'non_productive'));

-- ---------------------------------------------------------------- the calculation

-- Every tracked block of one organisation day that had non-productive minutes.
--
-- A minute counts when the site the app recorded for it is on the member's
-- list. The list for a member is, most specific first:
--   1. their own rule for the site
--   2. the organisation's rule for the site
--   3. the built-in list
-- When several listed sites match (youtube.com and music.youtube.com), the
-- longest one decides, so a single subdomain can be switched on or off.
--
-- Only credited blocks count, the same blocks that make up tracked time, and a
-- block's minutes never go above the length that block adds to tracked time.
CREATE OR REPLACE FUNCTION public.nonproductive_compute_blocks(p_org uuid, p_date date)
RETURNS TABLE (
  block_id               uuid,
  member_id              uuid,
  block_start            timestamptz,
  block_end              timestamptz,
  nonproductive_minutes  integer,
  domains                jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
WITH
blk AS (
  SELECT b.id, b.session_id, b.user_id, b.block_start, b.block_end,
         -- the same per-block length Owl Lens uses for tracked time
         ceil(least(extract(epoch FROM b.block_end - b.block_start), 720) / 60.0)::int AS len_mins
  FROM public.block_records b
  WHERE b.organization_id = p_org
    AND b.business_date = p_date
    AND coalesce(b.credited, false)
),
-- The recorded site for each minute of each block, cut down to a bare host:
-- "WWW.YouTube.com:443/watch" -> "www.youtube.com"
smp AS (
  SELECT k.id AS block_id, k.user_id,
         date_trunc('minute', a.recorded_at) AS minute,
         split_part(split_part(rtrim(lower(trim(a.domain)), '.'), '/', 1), ':', 1) AS host
  FROM blk k
  JOIN public.activity_samples a
    ON a.session_id = k.session_id
   AND a.recorded_at >= k.block_start
   AND a.recorded_at <  k.block_end
  WHERE coalesce(trim(a.domain), '') <> ''
),
src AS (
  SELECT NULL::uuid AS mid, d.domain, true AS np, 3 AS prio
  FROM public.nonproductive_default_domains d
  UNION ALL
  SELECT r.member_id, r.domain, r.is_nonproductive,
         CASE WHEN r.member_id IS NULL THEN 2 ELSE 1 END
  FROM public.nonproductive_domain_rules r
  WHERE r.organization_id = p_org
),
hosts AS (
  SELECT DISTINCT s.user_id, s.host FROM smp s WHERE s.host <> ''
),
res AS (
  SELECT DISTINCT ON (h.user_id, h.host) h.user_id, h.host, s.domain, s.np
  FROM hosts h
  JOIN src s
    ON (s.mid IS NULL OR s.mid = h.user_id)
   AND (h.host = s.domain OR right(h.host, length(s.domain) + 1) = '.' || s.domain)
  ORDER BY h.user_id, h.host, length(s.domain) DESC, s.prio
),
hit AS (
  SELECT p.block_id, p.minute, r.domain
  FROM smp p
  JOIN res r ON r.user_id = p.user_id AND r.host = p.host
  WHERE r.np
),
per_dom AS (
  SELECT h.block_id, jsonb_object_agg(h.domain, h.n ORDER BY h.n DESC) AS domains
  FROM (SELECT x.block_id, x.domain, count(DISTINCT x.minute)::int AS n
        FROM hit x GROUP BY x.block_id, x.domain) h
  GROUP BY h.block_id
),
per_blk AS (
  SELECT x.block_id, count(DISTINCT x.minute)::int AS n FROM hit x GROUP BY x.block_id
)
SELECT k.id, k.user_id, k.block_start, k.block_end,
       least(pb.n, greatest(k.len_mins, 1)),
       coalesce(pd.domains, '{}'::jsonb)
FROM blk k
JOIN per_blk pb ON pb.block_id = k.id
LEFT JOIN per_dom pd ON pd.block_id = k.id
$$;

-- Saves the calculation for one organisation day, replacing what was there,
-- so list changes and blocks that are later discarded are both picked up.
CREATE OR REPLACE FUNCTION public.nonproductive_refresh(p_org uuid, p_date date)
RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM public.nonproductive_blocks
   WHERE organization_id = p_org AND business_date = p_date;

  INSERT INTO public.nonproductive_blocks
    (block_id, organization_id, member_id, business_date, block_start, block_end,
     nonproductive_minutes, domains)
  SELECT c.block_id, p_org, c.member_id, p_date, c.block_start, c.block_end,
         c.nonproductive_minutes, c.domains
  FROM public.nonproductive_compute_blocks(p_org, p_date) c;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- One row per member who tracked time that day: tracked minutes (exactly as
-- Owl Lens counts them), non-productive minutes, and minutes per site.
CREATE OR REPLACE FUNCTION public.nonproductive_day_summary(p_org uuid, p_date date)
RETURNS TABLE (
  member_id                uuid,
  tracked_mins             numeric,
  nonproductive_mins       integer,
  domains                  jsonb,
  first_start              timestamptz,
  last_end                 timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
WITH
tracked AS (
  SELECT b.user_id,
         sum(least(extract(epoch FROM b.block_end - b.block_start), 720)) / 60.0 AS mins
  FROM public.block_records b
  WHERE b.organization_id = p_org AND b.business_date = p_date
    AND coalesce(b.credited, false)
  GROUP BY b.user_id
),
np AS (
  SELECT n.member_id, sum(n.nonproductive_minutes)::int AS mins,
         min(n.block_start) AS first_start, max(n.block_end) AS last_end
  FROM public.nonproductive_blocks n
  WHERE n.organization_id = p_org AND n.business_date = p_date
  GROUP BY n.member_id
),
dom AS (
  SELECT d.member_id, jsonb_object_agg(d.domain, d.mins ORDER BY d.mins DESC) AS domains
  FROM (SELECT n.member_id, e.key AS domain, sum(e.value::int)::int AS mins
        FROM public.nonproductive_blocks n
        CROSS JOIN LATERAL jsonb_each_text(n.domains) e
        WHERE n.organization_id = p_org AND n.business_date = p_date
        GROUP BY n.member_id, e.key) d
  GROUP BY d.member_id
)
-- never more than the day's tracked minutes (short blocks round up to a whole minute)
SELECT t.user_id, t.mins, least(coalesce(np.mins, 0), floor(t.mins)::int), coalesce(dom.domains, '{}'::jsonb),
       np.first_start, np.last_end
FROM tracked t
LEFT JOIN np  ON np.member_id  = t.user_id
LEFT JOIN dom ON dom.member_id = t.user_id
$$;

-- ---------------------------------------------------------------- Owl Lens

ALTER TABLE public.owl_lens_highlights DROP CONSTRAINT IF EXISTS owl_lens_highlights_kind_check;
ALTER TABLE public.owl_lens_highlights ADD CONSTRAINT owl_lens_highlights_kind_check CHECK (kind IN
  ('not_started','long_day','idle','low_input','input_pattern','app_mix','focus','non_productive'));

-- Non-productive minutes at a quarter or more of the day's tracked time, once
-- at least an hour has been tracked (so 10 minutes of a 20-minute morning is
-- not called out). Same members as every other Owl Lens rule: active, tracked,
-- and not marked as expected for the day.
CREATE OR REPLACE FUNCTION public.owl_lens_detect_non_productive(p_org uuid, p_date date)
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
mem AS (
  SELECT m.id
  FROM public.members m
  WHERE m.organization_id = p_org
    AND m.status = 'Active'
    AND coalesce(m.tracking_enabled, true)
    AND NOT EXISTS (
      SELECT 1 FROM public.owl_lens_highlights q
      WHERE q.organization_id = p_org AND q.member_id = m.id
        AND q.business_date = p_date AND q.status = 'expected')
),
s AS (
  SELECT d.*, (d.nonproductive_mins / d.tracked_mins) AS share
  FROM public.nonproductive_day_summary(p_org, p_date) d
  WHERE d.member_id IN (SELECT id FROM mem)
    AND d.tracked_mins >= 60
    AND d.nonproductive_mins * 4 >= d.tracked_mins
),
top AS (
  SELECT s.member_id,
         string_agg(e.key || ' ' || public.owl_lens_fmt_mins(e.value::numeric), ', '
                    ORDER BY e.value::int DESC, e.key) AS sites
  FROM s
  CROSS JOIN LATERAL (
    SELECT j.key, j.value FROM jsonb_each_text(s.domains) j
    ORDER BY j.value::int DESC, j.key LIMIT 3
  ) e
  GROUP BY s.member_id
)
SELECT s.member_id, 'non_productive'::text, 'warning'::text,
       public.owl_lens_fmt_mins(s.nonproductive_mins) || ' of '
       || public.owl_lens_fmt_mins(s.tracked_mins) || ' tracked ('
       || floor(s.share * 100)::int || '%) was on non-productive sites'
       || coalesce(': ' || t.sites, '') || '.',
       jsonb_build_object(
         'nonproductive_mins', s.nonproductive_mins,
         'tracked_mins',       round(s.tracked_mins),
         'share_pct',          floor(s.share * 100)::int,
         'domains',            s.domains),
       'rule'::text, s.first_start, s.last_end
FROM s
LEFT JOIN top t ON t.member_id = s.member_id
$$;

-- Same as before, plus: refresh the non-productive minutes for the day first,
-- and save the new rule's cards alongside the others.
CREATE OR REPLACE FUNCTION public.owl_lens_evaluate(p_org uuid, p_date date)
RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  PERFORM public.nonproductive_refresh(p_org, p_date);

  DROP TABLE IF EXISTS pg_temp.owl_lens_found;
  CREATE TEMP TABLE owl_lens_found AS
    SELECT * FROM public.owl_lens_detect(p_org, p_date)
    UNION ALL
    SELECT * FROM public.owl_lens_detect_non_productive(p_org, p_date);

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

-- ---------------------------------------------------------------- permissions

-- These read every organisation's activity, so clients never call them.
REVOKE ALL ON FUNCTION public.nonproductive_compute_blocks(uuid, date)   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.nonproductive_refresh(uuid, date)          FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.nonproductive_day_summary(uuid, date)      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.owl_lens_detect_non_productive(uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.owl_lens_evaluate(uuid, date)              FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.nonproductive_domain_rules_stamp()         FROM PUBLIC, anon, authenticated;
