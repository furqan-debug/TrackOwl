-- =============================================
-- RECURSION-PROOF RLS FIX
-- =============================================

-- 1. Create a helper function to break recursion
-- This function runs with "security definer" meaning it bypasses RLS
CREATE OR REPLACE FUNCTION get_member_org_id()
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

-- 2. Drop the recursive policies
DROP POLICY IF EXISTS "users_read_org_members" ON members;
DROP POLICY IF EXISTS "users_read_own_record" ON members;

-- 3. Create the profile-read policy (Non-recursive)
-- We use a simple check for "your own record" first
CREATE POLICY "users_read_own_record" ON members FOR SELECT
  TO authenticated
  USING (
    auth_user_id = auth.uid() 
    OR email = auth.jwt() ->> 'email'
  );

-- 4. Create the organization-read policy (Non-recursive)
-- We use our helper function to get the org ID without triggering RLS loops
CREATE POLICY "users_read_org_members" ON members FOR SELECT
  TO authenticated
  USING (
    organization_id IS NOT NULL 
    AND organization_id = get_member_org_id()
  );

-- 5. Ensure other tables aren't also looping (Clean up sessions policy too)
DROP POLICY IF EXISTS "users_read_own_sessions" ON sessions;
CREATE POLICY "users_read_own_sessions" ON sessions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()::text 
    OR organization_id = get_member_org_id()
  );
