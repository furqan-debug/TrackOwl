-- =============================================
-- THE MASTER RECURSION KILLER
-- Drops ALL existing policies and rebuilds safely
-- =============================================

DO $$ 
DECLARE 
    policy_record RECORD;
BEGIN
    -- 1. DROP ALL POLICIES ON THE MEMBERS TABLE AUTOMATICALLY
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'members'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON members', policy_record.policyname);
    END LOOP;
END $$;

-- 2. Create the "Safe Guard" function (Run as a super-user/security definer)
CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS uuid AS $$
BEGIN
  -- This bypasses RLS to safely find your ID
  RETURN (
    SELECT m.organization_id 
    FROM members m 
    WHERE m.auth_user_id = auth.uid() 
    OR m.email = auth.jwt() ->> 'email' 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Apply the new, non-recursive rules
-- Rule A: You can ALWAYS see your own profile
CREATE POLICY "members_self_read" ON members FOR SELECT
  TO authenticated
  USING (
    auth_user_id = auth.uid() 
    OR email = auth.jwt() ->> 'email'
  );

-- Rule B: You can see others ONLY if you have an organization
CREATE POLICY "members_org_read" ON members FOR SELECT
  TO authenticated
  USING (
    organization_id IS NOT NULL 
    AND organization_id = get_my_org_id()
  );

-- 4. Fix any other potential loops (Sessions, Organizations)
DROP POLICY IF EXISTS "users_read_own_organization" ON organizations;
CREATE POLICY "users_read_own_organization" ON organizations FOR SELECT
  TO authenticated
  USING (id = get_my_org_id());

DROP POLICY IF EXISTS "users_read_own_sessions" ON sessions;
CREATE POLICY "users_read_own_sessions" ON sessions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()::text 
    OR organization_id = get_my_org_id()
  );

-- ═══════════════════════════════════════════════════════════
-- FINAL CHECK: Enable RLS
-- ═══════════════════════════════════════════════════════════
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
