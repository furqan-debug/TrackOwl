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
  USING (user_id = auth.uid()::text);

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
-- VERIFICATION: Run these to confirm RLS is active
-- ═══════════════════════════════════════════════════════════
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE tablename IN ('sessions', 'activity_samples', 'screenshots');
-- Expected: rowsecurity = true for all three tables

-- SELECT * FROM pg_policies WHERE tablename IN ('sessions', 'activity_samples', 'screenshots');
-- Expected: All policies listed above appear
