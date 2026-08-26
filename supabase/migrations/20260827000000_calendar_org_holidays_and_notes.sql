-- =============================================
-- Calendar: org-scoped holidays + admin notes
-- 1. Scopes `holidays` to a single organization (was global/shared).
-- 2. Adds `calendar_notes` for admin-authored, org-wide-visible day notes.
-- =============================================

-- -----------------------------------------------------------------------------
-- 1. Scope holidays to an organization
-- -----------------------------------------------------------------------------
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_holidays_org ON holidays(organization_id);

-- Old constraint was global (date, name); replace with an org-scoped one so the
-- same holiday name/date can exist independently per organization.
ALTER TABLE holidays DROP CONSTRAINT IF EXISTS holidays_date_name_key;
DROP INDEX IF EXISTS idx_holidays_org_date_name;
CREATE UNIQUE INDEX idx_holidays_org_date_name ON holidays(organization_id, date, name);

-- -----------------------------------------------------------------------------
-- 2. Calendar notes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS calendar_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  note            TEXT NOT NULL,
  created_by      UUID REFERENCES members(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_notes_org_date ON calendar_notes(organization_id, date);

-- -----------------------------------------------------------------------------
-- 3. RLS
-- -----------------------------------------------------------------------------
ALTER TABLE holidays       ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_notes ENABLE ROW LEVEL SECURITY;

-- Drop the old "readable by everyone, no org scope" policy.
DROP POLICY IF EXISTS "anyone_read_holidays" ON holidays;

-- Holidays: readable by anyone in the same organization.
DROP POLICY IF EXISTS "org_read_holidays" ON holidays;
CREATE POLICY "org_read_holidays" ON holidays FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM members
      WHERE auth_user_id = auth.uid() OR email = auth.jwt() ->> 'email'
    )
  );

-- Holidays: only Owner/Admin/Manager can create/edit/delete, and only within their own org.
DROP POLICY IF EXISTS "managers_write_holidays" ON holidays;
CREATE POLICY "managers_write_holidays" ON holidays FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM members
      WHERE (auth_user_id = auth.uid() OR email = auth.jwt() ->> 'email')
        AND role IN ('Owner', 'Admin', 'Manager')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM members
      WHERE (auth_user_id = auth.uid() OR email = auth.jwt() ->> 'email')
        AND role IN ('Owner', 'Admin', 'Manager')
    )
  );

DROP POLICY IF EXISTS "service_role_all_holidays" ON holidays;
CREATE POLICY "service_role_all_holidays" ON holidays FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- Calendar notes: readable by anyone in the same organization (org-wide visible).
DROP POLICY IF EXISTS "org_read_calendar_notes" ON calendar_notes;
CREATE POLICY "org_read_calendar_notes" ON calendar_notes FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM members
      WHERE auth_user_id = auth.uid() OR email = auth.jwt() ->> 'email'
    )
  );

-- Calendar notes: only Owner/Admin/Manager can create/delete, only within their own org.
DROP POLICY IF EXISTS "managers_write_calendar_notes" ON calendar_notes;
CREATE POLICY "managers_write_calendar_notes" ON calendar_notes FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM members
      WHERE (auth_user_id = auth.uid() OR email = auth.jwt() ->> 'email')
        AND role IN ('Owner', 'Admin', 'Manager')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM members
      WHERE (auth_user_id = auth.uid() OR email = auth.jwt() ->> 'email')
        AND role IN ('Owner', 'Admin', 'Manager')
    )
  );

DROP POLICY IF EXISTS "service_role_all_calendar_notes" ON calendar_notes;
CREATE POLICY "service_role_all_calendar_notes" ON calendar_notes FOR ALL
  TO service_role USING (true) WITH CHECK (true);
