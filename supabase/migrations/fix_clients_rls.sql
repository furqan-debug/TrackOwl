-- Fix clients RLS policy to use auth_user_id instead of id

DROP POLICY IF EXISTS "users_manage_org_clients" ON clients;

CREATE POLICY "users_manage_org_clients" ON clients FOR ALL
  USING (organization_id IN (SELECT organization_id FROM members WHERE auth_user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM members WHERE auth_user_id = auth.uid()));
