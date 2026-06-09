-- =============================================
-- Migration: Super Admin Access for Management Portal
-- =============================================

-- 1. Add is_super_admin flag to members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT false;

-- 2. Create a helper function to check if the current user is a super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM members
    WHERE email = (SELECT auth.jwt() ->> 'email')
    AND is_super_admin = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. Add RLS Policies for super admin to bypass standard policies
-- Note: Make sure ROW LEVEL SECURITY is enabled on these tables.

-- Organizations
DROP POLICY IF EXISTS "Super admins can view all organizations" ON organizations;
CREATE POLICY "Super admins can view all organizations"
ON organizations FOR SELECT
USING (is_super_admin());

-- Members
DROP POLICY IF EXISTS "Super admins can view all members" ON members;
CREATE POLICY "Super admins can view all members"
ON members FOR SELECT
USING (is_super_admin());

-- Sessions
DROP POLICY IF EXISTS "Super admins can view all sessions" ON sessions;
CREATE POLICY "Super admins can view all sessions"
ON sessions FOR SELECT
USING (is_super_admin());

-- Payments
DROP POLICY IF EXISTS "Super admins can view all payments" ON payments;
CREATE POLICY "Super admins can view all payments"
ON payments FOR SELECT
USING (is_super_admin());

-- Support Tickets
DROP POLICY IF EXISTS "Super admins can view all support tickets" ON support_tickets;
CREATE POLICY "Super admins can view all support tickets"
ON support_tickets FOR SELECT
USING (is_super_admin());

-- Support Messages
DROP POLICY IF EXISTS "Super admins can view all support messages" ON support_messages;
CREATE POLICY "Super admins can view all support messages"
ON support_messages FOR SELECT
USING (is_super_admin());
