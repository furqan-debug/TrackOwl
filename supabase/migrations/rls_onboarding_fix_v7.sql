-- Allow users to insert themselves into members if they don't have a record yet
CREATE POLICY "members_onboarding_insert" ON members FOR INSERT TO authenticated
WITH CHECK (
    auth_user_id = auth.uid() 
    AND NOT EXISTS (SELECT 1 FROM members m WHERE m.auth_user_id = auth.uid())
);
