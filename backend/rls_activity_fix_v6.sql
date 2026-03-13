-- =============================================
-- DigiReps Tracker — Activity Visibility Fix v6
-- Ensures Admins/Managers can see team tracking data
-- =============================================

-- 1. Ensure sessions are readable by organization
-- (Using the get_my_org_id() helper from previous fixes)
DROP POLICY IF EXISTS "sessions_org_read" ON sessions;
CREATE POLICY "sessions_org_read" ON sessions FOR SELECT 
  TO authenticated 
  USING (organization_id = get_my_org_id());

-- 2. Ensure activity samples are readable by organization
-- Filter based on the organization_id of the associated session
DROP POLICY IF EXISTS "activity_org_read" ON activity_samples;
CREATE POLICY "activity_org_read" ON activity_samples FOR SELECT 
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM sessions WHERE organization_id = get_my_org_id()
    )
  );

-- 3. Ensure screenshots are readable by organization
DROP POLICY IF EXISTS "screenshots_org_read" ON screenshots;
CREATE POLICY "screenshots_org_read" ON screenshots FOR SELECT 
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM sessions WHERE organization_id = get_my_org_id()
    )
  );

-- 4. Maintain self-read for non-admin users (redundant if org_id is always set, but good for safety)
DROP POLICY IF EXISTS "users_read_own_sessions" ON sessions;
CREATE POLICY "users_read_own_sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

-- 5. Ensure service_role continues to have master access
DROP POLICY IF EXISTS "service_role_all_activity" ON activity_samples;
CREATE POLICY "service_role_all_activity" ON activity_samples FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_screenshots" ON screenshots;
CREATE POLICY "service_role_all_screenshots" ON screenshots FOR ALL TO service_role USING (true) WITH CHECK (true);
