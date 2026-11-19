-- Roll back 20261120000001_non_productive_sites.sql.
--
-- Puts Owl Lens back exactly as 20261119000001_owl_lens.sql left it and
-- removes everything the non-productive sites change added. Tracking data
-- (block_records, sessions, activity_samples) was never touched, so there is
-- nothing to restore there. The organisations' site lists are lost.

BEGIN;

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

REVOKE ALL ON FUNCTION public.owl_lens_evaluate(uuid, date) FROM PUBLIC, anon, authenticated;

DELETE FROM public.owl_lens_highlights WHERE kind = 'non_productive';
ALTER TABLE public.owl_lens_highlights DROP CONSTRAINT IF EXISTS owl_lens_highlights_kind_check;
ALTER TABLE public.owl_lens_highlights ADD CONSTRAINT owl_lens_highlights_kind_check CHECK (kind IN
  ('not_started','long_day','idle','low_input','input_pattern','app_mix','focus'));

DROP FUNCTION IF EXISTS public.owl_lens_detect_non_productive(uuid, date);
DROP FUNCTION IF EXISTS public.nonproductive_day_summary(uuid, date);
DROP FUNCTION IF EXISTS public.nonproductive_refresh(uuid, date);
DROP FUNCTION IF EXISTS public.nonproductive_compute_blocks(uuid, date);

DROP TABLE IF EXISTS public.nonproductive_blocks;
DROP TABLE IF EXISTS public.nonproductive_domain_rules;
DROP FUNCTION IF EXISTS public.nonproductive_domain_rules_stamp();
DROP TABLE IF EXISTS public.nonproductive_default_domains;

COMMIT;
