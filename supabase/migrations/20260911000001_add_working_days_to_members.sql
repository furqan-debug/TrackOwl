-- =============================================================================
-- Working days per member, and fractional hour limits
--
-- Adds working_days so the three limits form one consistent set:
--
--     weekly_limit = working_days * daily_limit
--
-- The admin sets any two and the third follows. That identity is what forces
-- the second change here: weekly_limit and daily_limit were INTEGER, so a
-- 40-hour week over 6 working days stored 6.67 h/day as 7, and 6 * 7 = 42 —
-- the set silently stopped agreeing with itself. Both columns become
-- NUMERIC(6,2) so the derived value is the value that gets stored.
--
-- Widening INTEGER to NUMERIC preserves every existing row exactly, and no
-- server-side function reads either column (verified against pg_proc), so the
-- only consumers are the admin portal and the desktop client, both of which
-- multiply the value into seconds and are unaffected by a decimal part.
-- =============================================================================

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS working_days SMALLINT NOT NULL DEFAULT 5;

COMMENT ON COLUMN members.working_days IS
  'Days per week this member is expected to work, 1-7. Ties daily_limit and weekly_limit together: weekly_limit = working_days * daily_limit.';

-- 1-7. Zero is not a working week, and there is no eighth day.
ALTER TABLE members
  DROP CONSTRAINT IF EXISTS members_working_days_range;

ALTER TABLE members
  ADD CONSTRAINT members_working_days_range
  CHECK (working_days BETWEEN 1 AND 7);

-- Fractional hours, so a derived daily limit survives being stored.
ALTER TABLE members
  ALTER COLUMN weekly_limit TYPE NUMERIC(6,2),
  ALTER COLUMN daily_limit  TYPE NUMERIC(6,2);

COMMENT ON COLUMN members.daily_limit IS
  'Hours per working day before tracking stops. Fractional, because it is commonly derived as weekly_limit / working_days.';

COMMENT ON COLUMN members.weekly_limit IS
  'Hours per week before tracking stops. Fractional, because it is commonly derived as working_days * daily_limit.';

-- There are 24 hours in a day and 168 in a week; a limit beyond either is not
-- a strict cap, it is a typo. Verified no existing row exceeds them.
ALTER TABLE members
  DROP CONSTRAINT IF EXISTS members_daily_limit_range;

ALTER TABLE members
  ADD CONSTRAINT members_daily_limit_range
  CHECK (daily_limit >= 0 AND daily_limit <= 24);

ALTER TABLE members
  DROP CONSTRAINT IF EXISTS members_weekly_limit_range;

ALTER TABLE members
  ADD CONSTRAINT members_weekly_limit_range
  CHECK (weekly_limit >= 0 AND weekly_limit <= 168);

-- PostgREST caches the schema; without this the new column 404s until restart.
NOTIFY pgrst, 'reload schema';
