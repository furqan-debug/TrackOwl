-- =============================================================================
-- Default holidays, seeded automatically per organization
--
-- Scope: a small universal set (New Year's Day, Christmas Day) rather than
-- country-specific calendars — these are recurring (is_recurring = true), so
-- they're matched by month/day against the org's calendar every year
-- regardless of which timezone the org is in (see holidayFallsOn() in
-- Calendar.tsx). Seeded once per org, on creation and on first timezone set;
-- flagged is_default so admins can tell them apart from ones they added by
-- hand, and deleting one doesn't cause it to silently reappear.
-- =============================================================================

ALTER TABLE holidays ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_holidays_seeded_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.seed_default_holidays(p_org_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO holidays (organization_id, name, date, is_recurring, is_default)
  VALUES
    (p_org_id, 'New Year''s Day', '2026-01-01', true, true),
    (p_org_id, 'Christmas Day',   '2026-12-25', true, true)
  ON CONFLICT (organization_id, date, name) DO NOTHING;

  UPDATE organizations SET default_holidays_seeded_at = now() WHERE id = p_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fires on org creation, and on any later update (e.g. the org's timezone
-- being set for the first time in Settings) until it has successfully seeded
-- once. SECURITY DEFINER on the function above lets this bypass the
-- managers_write_holidays RLS policy, since this isn't an admin-initiated write.
CREATE OR REPLACE FUNCTION public.trg_seed_default_holidays()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.default_holidays_seeded_at IS NULL THEN
    PERFORM seed_default_holidays(NEW.id);
  END IF;
  RETURN NULL; -- AFTER trigger, return value ignored
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_organizations_seed_holidays_insert ON organizations;
CREATE TRIGGER trg_organizations_seed_holidays_insert
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION trg_seed_default_holidays();

DROP TRIGGER IF EXISTS trg_organizations_seed_holidays_update ON organizations;
CREATE TRIGGER trg_organizations_seed_holidays_update
  AFTER UPDATE ON organizations
  FOR EACH ROW
  WHEN (NEW.default_holidays_seeded_at IS NULL)
  EXECUTE FUNCTION trg_seed_default_holidays();

-- Backfill: seed every organization that already exists and hasn't been seeded yet.
DO $$
DECLARE
  org RECORD;
BEGIN
  FOR org IN SELECT id FROM organizations WHERE default_holidays_seeded_at IS NULL LOOP
    PERFORM seed_default_holidays(org.id);
  END LOOP;
END $$;
