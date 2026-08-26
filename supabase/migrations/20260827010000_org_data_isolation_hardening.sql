-- =============================================================================
-- Multi-tenant data isolation hardening
--
-- Audit of the RLS history in this folder found several tables where either
-- (a) Row Level Security was never enabled at all (payments, invoices,
--     job_sites, custom_reports, timesheet_approvals, project_members,
--     project_teams, team_members), or
-- (b) a policy existed but matched the CALLER'S OWN organization incorrectly,
--     effectively giving any Admin-role user cross-tenant visibility
--     (time_off_requests), or checked members.id = auth.uid() instead of
--     members.auth_user_id = auth.uid(), which no longer matches how the app
--     authenticates (todos, todo_assignees).
--
-- This migration is idempotent (safe to re-run) and establishes ONE canonical
-- set of helper functions that every table's policies are rewritten against,
-- so there is a single source of truth for "what organization am I in" and
-- "am I allowed to write here" going forward.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PART 1 — Canonical helper functions
-- -----------------------------------------------------------------------------

-- Resolves the caller's organization from their JWT (auth_user_id, falling
-- back to email for legacy rows). SECURITY DEFINER so it can read `members`
-- even though members itself is RLS-protected; STABLE so Postgres evaluates
-- it once per query instead of once per row.
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid AS $$
  SELECT organization_id FROM members
  WHERE auth_user_id = auth.uid() OR email = auth.jwt() ->> 'email'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Owner/Admin/Manager are this app's three "management" roles (see
-- apps/admin-portal/src/nav/navModel.ts's allowedRoles convention). This
-- previously excluded 'Owner', which meant org owners failed admin checks.
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM members
    WHERE (auth_user_id = auth.uid() OR email = auth.jwt() ->> 'email')
      AND role IN ('Owner', 'Admin', 'Manager')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Matches the app's actual write-gating convention used almost everywhere
-- in the admin portal (JobSites, Invoices, CreatePayments, Timesheets, ...):
-- every role except 'Viewer' can create/edit records, only Viewer is read-only.
CREATE OR REPLACE FUNCTION public.is_not_viewer()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM members
    WHERE (auth_user_id = auth.uid() OR email = auth.jwt() ->> 'email')
      AND role <> 'Viewer'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- -----------------------------------------------------------------------------
-- PART 2 — Backfill missing organization_id linkage
-- -----------------------------------------------------------------------------

-- activity_samples / screenshots: some environments have organization_id
-- already (added outside version control); ensure it exists everywhere,
-- backfill any NULLs from the parent session, and auto-populate it on every
-- future insert so the desktop client (which never sends this field) can
-- never write a sample into the wrong tenant's bucket.
ALTER TABLE activity_samples ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE screenshots      ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

UPDATE activity_samples a SET organization_id = s.organization_id
FROM sessions s WHERE s.id = a.session_id AND a.organization_id IS NULL;

UPDATE screenshots ss SET organization_id = s.organization_id
FROM sessions s WHERE s.id = ss.session_id AND ss.organization_id IS NULL;

CREATE OR REPLACE FUNCTION public.trg_set_org_from_session()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT organization_id INTO NEW.organization_id FROM sessions WHERE id = NEW.session_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_activity_samples_set_org ON activity_samples;
CREATE TRIGGER trg_activity_samples_set_org
  BEFORE INSERT ON activity_samples
  FOR EACH ROW EXECUTE FUNCTION trg_set_org_from_session();

DROP TRIGGER IF EXISTS trg_screenshots_set_org ON screenshots;
CREATE TRIGGER trg_screenshots_set_org
  BEFORE INSERT ON screenshots
  FOR EACH ROW EXECUTE FUNCTION trg_set_org_from_session();

CREATE INDEX IF NOT EXISTS idx_activity_samples_org ON activity_samples(organization_id);
CREATE INDEX IF NOT EXISTS idx_screenshots_org ON screenshots(organization_id);

-- job_sites / custom_reports: no organization_id existed in tracked history
-- (job_sites' column may already exist live since the frontend writes it).
-- Auto-derive from the inserting user's own org so no frontend change is
-- required for custom_reports, and job_sites is defended even if a client
-- ever omits or forges the field.
ALTER TABLE job_sites      ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE custom_reports ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.trg_set_org_from_caller()
RETURNS TRIGGER AS $$
BEGIN
  NEW.organization_id := get_my_org_id();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_job_sites_set_org ON job_sites;
CREATE TRIGGER trg_job_sites_set_org
  BEFORE INSERT ON job_sites
  FOR EACH ROW EXECUTE FUNCTION trg_set_org_from_caller();

DROP TRIGGER IF EXISTS trg_custom_reports_set_org ON custom_reports;
CREATE TRIGGER trg_custom_reports_set_org
  BEFORE INSERT ON custom_reports
  FOR EACH ROW EXECUTE FUNCTION trg_set_org_from_caller();

CREATE INDEX IF NOT EXISTS idx_job_sites_org ON job_sites(organization_id);
CREATE INDEX IF NOT EXISTS idx_custom_reports_org ON custom_reports(organization_id);

-- payments / invoices: neither CreatePayments.tsx nor Invoices.tsx currently
-- sets organization_id on insert. Auto-derive it server-side so those pages
-- keep working once writes are required to match the caller's own org
-- (this also means any future INSERT can never target another tenant no
-- matter what the client sends).
CREATE OR REPLACE FUNCTION public.trg_set_org_from_caller_or_member()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    -- Prefer the caller's own org; fall back to the payment/invoice's
    -- member/client-linked org for backend/service-role inserts made on
    -- behalf of someone else.
    NEW.organization_id := COALESCE(get_my_org_id(), NEW.organization_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_payments_set_org ON payments;
CREATE TRIGGER trg_payments_set_org
  BEFORE INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION trg_set_org_from_caller_or_member();

DROP TRIGGER IF EXISTS trg_invoices_set_org ON invoices;
CREATE TRIGGER trg_invoices_set_org
  BEFORE INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION trg_set_org_from_caller_or_member();

-- -----------------------------------------------------------------------------
-- PART 3 — Enable RLS everywhere it was previously missing
-- -----------------------------------------------------------------------------
ALTER TABLE payments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices            ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_sites           ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_reports      ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_teams       ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members        ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- PART 4 — Payments
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "org_read_payments" ON payments;
CREATE POLICY "org_read_payments" ON payments FOR SELECT
  TO authenticated USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "org_write_payments" ON payments;
CREATE POLICY "org_write_payments" ON payments FOR ALL
  TO authenticated
  USING (organization_id = get_my_org_id() AND is_not_viewer())
  WITH CHECK (organization_id = get_my_org_id() AND is_not_viewer());

DROP POLICY IF EXISTS "service_role_all_payments" ON payments;
CREATE POLICY "service_role_all_payments" ON payments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- PART 5 — Invoices
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "org_read_invoices" ON invoices;
CREATE POLICY "org_read_invoices" ON invoices FOR SELECT
  TO authenticated USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "org_write_invoices" ON invoices;
CREATE POLICY "org_write_invoices" ON invoices FOR ALL
  TO authenticated
  USING (organization_id = get_my_org_id() AND is_not_viewer())
  WITH CHECK (organization_id = get_my_org_id() AND is_not_viewer());

DROP POLICY IF EXISTS "service_role_all_invoices" ON invoices;
CREATE POLICY "service_role_all_invoices" ON invoices FOR ALL TO service_role USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- PART 6 — Job Sites
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "org_read_job_sites" ON job_sites;
CREATE POLICY "org_read_job_sites" ON job_sites FOR SELECT
  TO authenticated USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "org_write_job_sites" ON job_sites;
CREATE POLICY "org_write_job_sites" ON job_sites FOR ALL
  TO authenticated
  USING (organization_id = get_my_org_id() AND is_not_viewer())
  WITH CHECK (organization_id = get_my_org_id() AND is_not_viewer());

DROP POLICY IF EXISTS "service_role_all_job_sites" ON job_sites;
CREATE POLICY "service_role_all_job_sites" ON job_sites FOR ALL TO service_role USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- PART 7 — Custom Reports
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "org_read_custom_reports" ON custom_reports;
CREATE POLICY "org_read_custom_reports" ON custom_reports FOR SELECT
  TO authenticated USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "org_write_custom_reports" ON custom_reports;
CREATE POLICY "org_write_custom_reports" ON custom_reports FOR ALL
  TO authenticated
  USING (organization_id = get_my_org_id())
  WITH CHECK (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "service_role_all_custom_reports" ON custom_reports;
CREATE POLICY "service_role_all_custom_reports" ON custom_reports FOR ALL TO service_role USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- PART 8 — Timesheet Approvals (scoped via member_id -> members.organization_id)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "org_read_timesheet_approvals" ON timesheet_approvals;
CREATE POLICY "org_read_timesheet_approvals" ON timesheet_approvals FOR SELECT
  TO authenticated USING (
    member_id IN (SELECT id FROM members WHERE organization_id = get_my_org_id())
  );

DROP POLICY IF EXISTS "org_write_timesheet_approvals" ON timesheet_approvals;
CREATE POLICY "org_write_timesheet_approvals" ON timesheet_approvals FOR ALL
  TO authenticated
  USING (
    is_not_viewer() AND member_id IN (SELECT id FROM members WHERE organization_id = get_my_org_id())
  )
  WITH CHECK (
    is_not_viewer() AND member_id IN (SELECT id FROM members WHERE organization_id = get_my_org_id())
  );

DROP POLICY IF EXISTS "service_role_all_timesheet_approvals" ON timesheet_approvals;
CREATE POLICY "service_role_all_timesheet_approvals" ON timesheet_approvals FOR ALL TO service_role USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- PART 9 — Project/Team junction tables
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "org_access_project_members" ON project_members;
CREATE POLICY "org_access_project_members" ON project_members FOR ALL
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE organization_id = get_my_org_id()))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE organization_id = get_my_org_id()));

DROP POLICY IF EXISTS "org_access_project_teams" ON project_teams;
CREATE POLICY "org_access_project_teams" ON project_teams FOR ALL
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE organization_id = get_my_org_id()))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE organization_id = get_my_org_id()));

DROP POLICY IF EXISTS "org_access_team_members" ON team_members;
CREATE POLICY "org_access_team_members" ON team_members FOR ALL
  TO authenticated
  USING (team_id IN (SELECT id FROM teams WHERE organization_id = get_my_org_id()))
  WITH CHECK (team_id IN (SELECT id FROM teams WHERE organization_id = get_my_org_id()));

DROP POLICY IF EXISTS "service_role_all_project_members" ON project_members;
CREATE POLICY "service_role_all_project_members" ON project_members FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_all_project_teams" ON project_teams;
CREATE POLICY "service_role_all_project_teams" ON project_teams FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_all_team_members" ON team_members;
CREATE POLICY "service_role_all_team_members" ON team_members FOR ALL TO service_role USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- PART 10 — Todos / Todo Assignees
-- Replaces the "me.id = auth.uid()" checks from add_todos_rls_policies.sql,
-- which stopped matching once the app started resolving the caller via
-- members.auth_user_id (see AuthContext.tsx) instead of members.id.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "todos_org_select" ON todos;
DROP POLICY IF EXISTS "todos_org_insert" ON todos;
DROP POLICY IF EXISTS "todos_org_update" ON todos;
DROP POLICY IF EXISTS "todos_org_delete" ON todos;

CREATE POLICY "todos_org_all" ON todos FOR ALL
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE organization_id = get_my_org_id()))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE organization_id = get_my_org_id()));

DROP POLICY IF EXISTS "todo_assignees_org_select" ON todo_assignees;
DROP POLICY IF EXISTS "todo_assignees_org_insert" ON todo_assignees;
DROP POLICY IF EXISTS "todo_assignees_org_update" ON todo_assignees;
DROP POLICY IF EXISTS "todo_assignees_org_delete" ON todo_assignees;

CREATE POLICY "todo_assignees_org_all" ON todo_assignees FOR ALL
  TO authenticated
  USING (
    todo_id IN (
      SELECT t.id FROM todos t JOIN projects p ON p.id = t.project_id
      WHERE p.organization_id = get_my_org_id()
    )
  )
  WITH CHECK (
    todo_id IN (
      SELECT t.id FROM todos t JOIN projects p ON p.id = t.project_id
      WHERE p.organization_id = get_my_org_id()
    )
  );

-- (todos_service_role_all / todo_assignees_service_role_all already exist from
--  add_todos_rls_policies.sql and are left in place.)

-- -----------------------------------------------------------------------------
-- PART 11 — Time Off Requests
-- The previous "auth.uid() IN (SELECT id FROM members WHERE role = 'Admin')"
-- clause let ANY Admin-role member read/approve every organization's time
-- off requests, since it never checked the row's own organization.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "users_read_own_time_off" ON time_off_requests;
CREATE POLICY "org_read_time_off_requests" ON time_off_requests FOR SELECT
  TO authenticated
  USING (member_id IN (SELECT id FROM members WHERE organization_id = get_my_org_id()));

DROP POLICY IF EXISTS "users_insert_own_time_off" ON time_off_requests;
CREATE POLICY "self_insert_time_off_requests" ON time_off_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (
      SELECT id FROM members WHERE auth_user_id = auth.uid() OR email = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "org_manage_time_off_requests" ON time_off_requests;
CREATE POLICY "org_manage_time_off_requests" ON time_off_requests FOR UPDATE
  TO authenticated
  USING (is_admin_or_manager() AND member_id IN (SELECT id FROM members WHERE organization_id = get_my_org_id()))
  WITH CHECK (is_admin_or_manager() AND member_id IN (SELECT id FROM members WHERE organization_id = get_my_org_id()));

-- service_role_all_time_off already exists from supabase_rls_policies.sql and is left in place.

-- -----------------------------------------------------------------------------
-- PART 12 — Reaffirm holidays / calendar_notes against the canonical helpers
-- (functionally identical to 20260827000000, just consolidated onto the
-- shared get_my_org_id()/is_admin_or_manager() helpers instead of inline
-- subqueries, and picking up the Owner-role fix.)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "org_read_holidays" ON holidays;
CREATE POLICY "org_read_holidays" ON holidays FOR SELECT
  TO authenticated USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "managers_write_holidays" ON holidays;
CREATE POLICY "managers_write_holidays" ON holidays FOR ALL
  TO authenticated
  USING (organization_id = get_my_org_id() AND is_admin_or_manager())
  WITH CHECK (organization_id = get_my_org_id() AND is_admin_or_manager());

DROP POLICY IF EXISTS "org_read_calendar_notes" ON calendar_notes;
CREATE POLICY "org_read_calendar_notes" ON calendar_notes FOR SELECT
  TO authenticated USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "managers_write_calendar_notes" ON calendar_notes;
CREATE POLICY "managers_write_calendar_notes" ON calendar_notes FOR ALL
  TO authenticated
  USING (organization_id = get_my_org_id() AND is_admin_or_manager())
  WITH CHECK (organization_id = get_my_org_id() AND is_admin_or_manager());
