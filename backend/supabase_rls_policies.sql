-- =============================================
-- DigiReps Tracker — Supabase RLS Policies
-- Run this AFTER supabase_schema.sql
-- Paste into Supabase Dashboard → SQL Editor
-- =============================================

-- ═══════════════════════════════════════════════════════════
-- STEP 1: Enable RLS on all tables
-- ═══════════════════════════════════════════════════════════

ALTER TABLE sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_samples  ENABLE ROW LEVEL SECURITY;
ALTER TABLE screenshots       ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════
-- STEP 2: sessions policies
-- ═══════════════════════════════════════════════════════════

-- Users can only read their own sessions (Electron tracker uses user_id = auth.uid())
DROP POLICY IF EXISTS "users_read_own_sessions" ON sessions;
CREATE POLICY "users_read_own_sessions"
  ON sessions FOR SELECT
  USING (
    user_id = auth.uid()::text 
    OR organization_id IN (SELECT organization_id FROM members WHERE id = auth.uid() AND role = 'Admin')
  );

-- Users can INSERT their own sessions
DROP POLICY IF EXISTS "users_insert_own_sessions" ON sessions;
CREATE POLICY "users_insert_own_sessions"
  ON sessions FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

-- Explicitly allow service_role to bypass RLS (redundant but solves issues if FORCE RLS is on)
DROP POLICY IF EXISTS "service_role_all_sessions" ON sessions;
CREATE POLICY "service_role_all_sessions"
  ON sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to insert sessions if needed (e.g. if the backend uses authenticated role)
DROP POLICY IF EXISTS "authenticated_insert_sessions" ON sessions;
CREATE POLICY "authenticated_insert_sessions"
  ON sessions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════
-- STEP 3: activity_samples policies
-- ═══════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "users_read_own_activity" ON activity_samples;
CREATE POLICY "users_read_own_activity"
  ON activity_samples FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM sessions WHERE user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "service_role_all_activity" ON activity_samples;
CREATE POLICY "service_role_all_activity"
  ON activity_samples FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_insert_activity" ON activity_samples;
CREATE POLICY "authenticated_insert_activity"
  ON activity_samples FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════
-- STEP 4: screenshots policies
-- ═══════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "users_read_own_screenshots" ON screenshots;
CREATE POLICY "users_read_own_screenshots"
  ON screenshots FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM sessions WHERE user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "service_role_all_screenshots" ON screenshots;
CREATE POLICY "service_role_all_screenshots"
  ON screenshots FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_insert_screenshots" ON screenshots;
CREATE POLICY "authenticated_insert_screenshots"
  ON screenshots FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════
-- STEP 5: Admin read-all policy (for admin portal anon key)
-- ═══════════════════════════════════════════════════════════

-- Allow anon (admin portal) to read all data
DROP POLICY IF EXISTS "anon_admin_read_sessions" ON sessions;
CREATE POLICY "anon_admin_read_sessions" ON sessions FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_admin_read_activity" ON activity_samples;
CREATE POLICY "anon_admin_read_activity" ON activity_samples FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_admin_read_screenshots" ON screenshots;
CREATE POLICY "anon_admin_read_screenshots" ON screenshots FOR SELECT TO anon USING (true);

-- Allow anon to read related tables (projects, members, clients) if RLS is enabled on them
-- (Currently RLS is not enabled on them in this script, but adding for completeness)
-- CREATE POLICY "anon_read_members" ON members FOR SELECT TO anon USING (true);
-- CREATE POLICY "anon_read_projects" ON projects FOR SELECT TO anon USING (true);
-- CREATE POLICY "anon_read_clients" ON clients FOR SELECT TO anon USING (true);

-- ═══════════════════════════════════════════════════════════
-- STEP 6: Storage (screenshots bucket) policies
-- ═══════════════════════════════════════════════════════════
-- (Kept as is or updated to be more permissive for service role)
DROP POLICY IF EXISTS "service_upload_screenshots" ON storage.objects;
DROP POLICY IF EXISTS "service_managed_screenshots" ON storage.objects;
CREATE POLICY "service_managed_screenshots"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'screenshots')
  WITH CHECK (bucket_id = 'screenshots');

DROP POLICY IF EXISTS "anon_view_screenshots" ON storage.objects;
CREATE POLICY "anon_view_screenshots"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'screenshots');

-- ═══════════════════════════════════════════════════════════
-- STEP 7: Holidays and Time Off Requests
-- ═══════════════════════════════════════════════════════════

ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;

-- Holidays are readable by everyone
DROP POLICY IF EXISTS "anyone_read_holidays" ON holidays;
CREATE POLICY "anyone_read_holidays" ON holidays FOR SELECT USING (true);

-- Users can manage their own time off requests
DROP POLICY IF EXISTS "users_read_own_time_off" ON time_off_requests;
CREATE POLICY "users_read_own_time_off"
  ON time_off_requests FOR SELECT
  USING (member_id = auth.uid() OR auth.uid() IN (SELECT id FROM members WHERE role = 'Admin'));

DROP POLICY IF EXISTS "users_insert_own_time_off" ON time_off_requests;
CREATE POLICY "users_insert_own_time_off"
  ON time_off_requests FOR INSERT
  WITH CHECK (member_id = auth.uid());

-- Admin/Service Role can manage all
DROP POLICY IF EXISTS "service_role_all_time_off" ON time_off_requests;
CREATE POLICY "service_role_all_time_off"
  ON time_off_requests FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════
-- STEP 8: Organization-scoped access (Multitenancy)
-- ═══════════════════════════════════════════════════════════

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects      ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams         ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients       ENABLE ROW LEVEL SECURITY;

-- 1. Organizations: Users can ONLY see their own organization
DROP POLICY IF EXISTS "users_read_own_organization" ON organizations;
CREATE POLICY "users_read_own_organization" ON organizations FOR SELECT
  USING (id IN (SELECT organization_id FROM members WHERE id = auth.uid()));

-- 2. Members: Users can see members in the same organization
DROP POLICY IF EXISTS "users_read_org_members" ON members;
CREATE POLICY "users_read_org_members" ON members FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM members WHERE id = auth.uid()));

-- 3. Projects: Organization-scoped read/write
DROP POLICY IF EXISTS "users_manage_org_projects" ON projects;
CREATE POLICY "users_manage_org_projects" ON projects FOR ALL
  USING (organization_id IN (SELECT organization_id FROM members WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM members WHERE id = auth.uid()));

-- 4. Teams: Organization-scoped read/write
DROP POLICY IF EXISTS "users_manage_org_teams" ON teams;
CREATE POLICY "users_manage_org_teams" ON teams FOR ALL
  USING (organization_id IN (SELECT organization_id FROM members WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM members WHERE id = auth.uid()));

-- 5. Clients: Organization-scoped read/write
DROP POLICY IF EXISTS "users_manage_org_clients" ON clients;
CREATE POLICY "users_manage_org_clients" ON clients FOR ALL
  USING (organization_id IN (SELECT organization_id FROM members WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM members WHERE id = auth.uid()));

-- Service Role Bypass (Essential for backend operations)
DROP POLICY IF EXISTS "service_role_organizations" ON organizations;
CREATE POLICY "service_role_organizations" ON organizations FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_members" ON members;
CREATE POLICY "service_role_members" ON members FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_projects" ON projects;
CREATE POLICY "service_role_projects" ON projects FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_teams" ON teams;
CREATE POLICY "service_role_teams" ON teams FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_clients" ON clients;
CREATE POLICY "service_role_clients" ON clients FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow Anon (Portal) to read for now (as per existing pattern, but restricted by service_role usage in backend)
DROP POLICY IF EXISTS "anon_read_all_org_data" ON organizations;
CREATE POLICY "anon_read_all_org_data" ON organizations FOR SELECT TO anon USING (true);

-- Explicitly allow any authenticated user to read all organizations/members for portal fetching
-- (Alternative to deep subqueries if complexity limits are hit)
-- CREATE POLICY "authenticated_read_orgs" ON organizations FOR SELECT TO authenticated USING (true);
