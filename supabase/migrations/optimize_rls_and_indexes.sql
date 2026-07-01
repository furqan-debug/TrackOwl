-- ==============================================================
-- DigiReps Tracker — RLS Security and Performance Optimization
-- Bypasses N+1 volatile subqueries by marking helper functions as STABLE,
-- simplifying table policies, and creating missing indexes.
-- ==============================================================

-- 1. Alter functions to be STABLE so PostgreSQL executes them once per query instead of row-by-row
CREATE OR REPLACE FUNCTION public.get_my_org_id()
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM members 
    WHERE (auth_user_id = auth.uid() OR email = auth.jwt() ->> 'email')
    AND role IN ('Admin', 'Manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Optimize RLS policies on activity_samples to filter by organization_id directly
DROP POLICY IF EXISTS "activity_org_read" ON activity_samples;
CREATE POLICY "activity_org_read" ON activity_samples FOR SELECT 
  TO authenticated
  USING (organization_id = get_my_org_id());

-- 3. Optimize RLS policies on screenshots to filter by organization_id directly
DROP POLICY IF EXISTS "screenshots_org_read" ON screenshots;
CREATE POLICY "screenshots_org_read" ON screenshots FOR SELECT 
  TO authenticated
  USING (organization_id = get_my_org_id());

-- 4. Create missing indexes on organization_id for activity_samples and screenshots
CREATE INDEX IF NOT EXISTS idx_activity_samples_org ON activity_samples (organization_id);
CREATE INDEX IF NOT EXISTS idx_screenshots_org ON screenshots (organization_id);
