-- =============================================
-- FIX: Allow users to read their own member record
-- This is critical for the initial login/profile fetch
-- =============================================

-- Enable RLS on members if not already enabled
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- 1. Allow authenticated users to read their own record by email
DROP POLICY IF EXISTS "users_read_own_record" ON members;
CREATE POLICY "users_read_own_record" ON members FOR SELECT
  TO authenticated
  USING (email = auth.jwt() ->> 'email');

-- 2. Keep the existing org-based policy but make it more robust (allow reading if same org)
-- Note: Simplified to avoid recursion issues if possible
DROP POLICY IF EXISTS "users_read_org_members" ON members;
CREATE POLICY "users_read_org_members" ON members FOR SELECT
  TO authenticated
  USING (
    organization_id IS NOT NULL 
    AND organization_id IN (
      SELECT m.organization_id FROM members m WHERE m.email = auth.jwt() ->> 'email'
    )
  );

-- 3. Ensure admins can read everything in their org (redundant but helpful)
DROP POLICY IF EXISTS "admins_read_all_org_members" ON members;
CREATE POLICY "admins_read_all_org_members" ON members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m 
      WHERE m.email = auth.jwt() ->> 'email' 
      AND m.role = 'Admin' 
      AND m.organization_id = members.organization_id
    )
  );
