-- =============================================
-- DigiReps Tracker — Invitation Fix
-- Ensures organization_id is NOT NULL and drops potentially conflicting triggers
-- =============================================

-- 1. Ensure the constraint exists and is strict
-- If there are any existing NULLs, we can't make it NOT NULL immediately.
-- However, according to human logic, we should never have them.
-- In case there are some, we leave them for now or set a default?
-- Let's just enforce the NOT NULL constraint.
DO $$
BEGIN
    ALTER TABLE members ALTER COLUMN organization_id SET NOT NULL;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not set NOT NULL (likely existing nulls). Please clean up data first.';
END $$;

-- 2. Drop the suspected auto-creation trigger
-- These are common names for Supabase Profile triggers.
-- We drop them because our Node.js/Vercel backend handles member creation manually
-- with full control over the organization_id.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS tr_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS sync_user_to_members ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;

-- 3. Ensure full_name and email are also strict
ALTER TABLE members ALTER COLUMN full_name SET NOT NULL;
ALTER TABLE members ALTER COLUMN email SET NOT NULL;
