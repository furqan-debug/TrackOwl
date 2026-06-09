-- =============================================
-- Migration: Platform Metrics Enhancement
-- Adds tracking for OS, App Version, Plan Tier, and System Logs
-- =============================================

-- 1. Add app_version and os_platform to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS app_version TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS os_platform TEXT; -- e.g., 'Windows 11', 'macOS 14', 'Windows 10'

-- 2. Add explicit plan_tier to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'Starter'
  CHECK (plan_tier IN ('Starter', 'Pro', 'Enterprise'));

-- Migrate existing data: if they have a stripe_subscription_id, treat as Pro
UPDATE organizations
  SET plan_tier = 'Pro'
  WHERE stripe_subscription_id IS NOT NULL
    AND plan_tier = 'Starter';

-- 3. Create system_logs table for error tracking
CREATE TABLE IF NOT EXISTS system_logs (
  id          BIGSERIAL PRIMARY KEY,
  level       TEXT NOT NULL DEFAULT 'info'   -- 'info' | 'warn' | 'error' | 'critical'
    CHECK (level IN ('info', 'warn', 'error', 'critical')),
  source      TEXT NOT NULL,                 -- e.g., 'desktop_app', 'api', 'sync_worker'
  message     TEXT NOT NULL,
  context     JSONB,
  session_id  UUID REFERENCES sessions(id) ON DELETE SET NULL,
  user_id     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);

-- 4. Add member_count cache column to organizations for performance
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS member_count INTEGER NOT NULL DEFAULT 0;

-- Update member counts from existing data
UPDATE organizations o
  SET member_count = (
    SELECT COUNT(*) FROM members m WHERE m.organization_id = o.id
  );

-- 5. Add seat_limit column to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS seat_limit INTEGER NOT NULL DEFAULT 10;

-- Update seat_limit based on plan_tier
UPDATE organizations SET seat_limit = 10  WHERE plan_tier = 'Starter';
UPDATE organizations SET seat_limit = 50  WHERE plan_tier = 'Pro';
UPDATE organizations SET seat_limit = 500 WHERE plan_tier = 'Enterprise';

-- 6. RLS Policies for system_logs (super admins only)
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can view all system logs" ON system_logs;
CREATE POLICY "Super admins can view all system logs"
ON system_logs FOR SELECT
USING (is_super_admin());

-- 7. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
