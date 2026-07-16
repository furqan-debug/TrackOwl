-- =============================================
-- FINAL FIX: Link profiles via Auth ID OR Email
-- =============================================

-- 1. Enable RLS on members
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- 2. Allow reading your own profile (The most secure way)
DROP POLICY IF EXISTS "users_read_own_record" ON members;
CREATE POLICY "users_read_own_record" ON members FOR SELECT
  TO authenticated
  USING (
    auth_user_id = auth.uid() 
    OR email = auth.jwt() ->> 'email'
  );

-- 3. Allow viewing other members in the same organization
DROP POLICY IF EXISTS "users_read_org_members" ON members;
CREATE POLICY "users_read_org_members" ON members FOR SELECT
  TO authenticated
  USING (
    organization_id IS NOT NULL 
    AND organization_id IN (
      SELECT m.organization_id FROM members m 
      WHERE m.auth_user_id = auth.uid() OR m.email = auth.jwt() ->> 'email'
    )
  );
