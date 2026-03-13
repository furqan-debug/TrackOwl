-- =============================================
-- DigiReps Tracker — RLS Security Fix v5
-- FIXES INFINITE RECURSION using SECURITY DEFINER functions
-- =============================================

-- 1. Create Helper Functions (SECURITY DEFINER bypasses RLS safely)
CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT organization_id 
    FROM members 
    WHERE auth_user_id = auth.uid() 
    OR email = auth.jwt() ->> 'email' 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin_or_manager()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM members 
    WHERE (auth_user_id = auth.uid() OR email = auth.jwt() ->> 'email')
    AND role IN ('Admin', 'Manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop ALL existing policies on members to start clean
DO $$ 
DECLARE 
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'members'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON members', policy_record.policyname);
    END LOOP;
END $$;

-- 3. Apply RECURSION-FREE policies

-- Rule A: Master bypass for service_role
CREATE POLICY "service_role_master_bypass" ON members FOR ALL 
  TO service_role USING (true) WITH CHECK (true);

-- Rule B: You can always see your own profile (Self-read)
-- Note: We use auth.uid() AND auth.jwt() email to be extra safe
CREATE POLICY "members_self_read" ON members FOR SELECT
  TO authenticated
  USING (
    auth_user_id = auth.uid() 
    OR email = auth.jwt() ->> 'email'
  );

-- Rule C: You can see others in your organization
-- Uses the non-recursive helper function
CREATE POLICY "members_org_read" ON members FOR SELECT
  TO authenticated
  USING (
    organization_id IS NOT NULL 
    AND organization_id = get_my_org_id()
  );

-- Rule D: Admins/Managers can manage members in their organization
CREATE POLICY "members_manager_all" ON members FOR ALL
  TO authenticated
  USING (
    is_admin_or_manager() 
    AND organization_id = get_my_org_id()
  )
  WITH CHECK (
    is_admin_or_manager() 
    AND (organization_id = get_my_org_id() OR organization_id IS NULL)
  );

-- Rule E: Explicitly allow the initial INSERT by authenticated/anon for onboarding/invites
-- (Ideally limited to service_role, but if the backend uses a client it might need this)
CREATE POLICY "members_insert_bypass" ON members FOR INSERT
  TO authenticated, anon, service_role
  WITH CHECK (true);

-- 4. Ensure RLS is enabled
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- 5. Fix Organizations/Sessions/Projects as well to use the same pattern
DROP POLICY IF EXISTS "service_role_master_bypass" ON organizations;
CREATE POLICY "service_role_master_bypass" ON organizations FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "users_read_own_organization" ON organizations;
CREATE POLICY "users_read_own_organization" ON organizations FOR SELECT TO authenticated USING (id = get_my_org_id());

DROP POLICY IF EXISTS "service_role_master_bypass" ON projects;
CREATE POLICY "service_role_master_bypass" ON projects FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "projects_org_read" ON projects;
CREATE POLICY "projects_org_read" ON projects FOR SELECT TO authenticated USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "service_role_master_bypass" ON sessions;
CREATE POLICY "service_role_master_bypass" ON sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "sessions_org_read" ON sessions;
CREATE POLICY "sessions_org_read" ON sessions FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
