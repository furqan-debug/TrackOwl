-- Add auth_user_id column if it doesn't exist
ALTER TABLE members ADD COLUMN IF NOT EXISTS auth_user_id UUID;

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_members_auth_user_id ON members(auth_user_id);
