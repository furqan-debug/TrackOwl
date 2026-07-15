-- ==============================================================
-- Migration: Fix RLS Policies for Teams and Clients Tables
-- Fixes issue where managers/members couldn't fetch teams/clients
-- due to a recursive id = auth.uid() mismatch bug in policies.
-- ==============================================================

-- 1. Fix RLS policy on teams using the stable helper function
DROP POLICY IF EXISTS "users_manage_org_teams" ON public.teams;
CREATE POLICY "users_manage_org_teams" ON public.teams FOR ALL
  TO authenticated
  USING (organization_id = get_my_org_id())
  WITH CHECK (organization_id = get_my_org_id());

-- 2. Fix RLS policy on clients using the stable helper function
DROP POLICY IF EXISTS "users_manage_org_clients" ON public.clients;
CREATE POLICY "users_manage_org_clients" ON public.clients FOR ALL
  TO authenticated
  USING (organization_id = get_my_org_id())
  WITH CHECK (organization_id = get_my_org_id());
