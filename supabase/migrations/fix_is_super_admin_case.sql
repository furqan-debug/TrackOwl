-- Update is_super_admin to be case insensitive just in case
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM members
    WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
    AND is_super_admin = true
  );
$$ LANGUAGE sql SECURITY DEFINER;
