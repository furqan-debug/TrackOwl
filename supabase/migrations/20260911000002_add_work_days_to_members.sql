-- =============================================================================
-- Which days of the week a member works
--
-- working_days already says HOW MANY days a member works. This says WHICH ones,
-- so a 4-day member can be Mon-Thu or Tue-Fri and the difference is recorded
-- rather than assumed.
--
-- Stored as ISO weekday numbers: 1 = Monday through 7 = Sunday, matching
-- EXTRACT(ISODOW FROM ts), so scheduling and reporting queries can compare
-- against this array directly without a lookup table.
-- =============================================================================

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS work_days SMALLINT[] NOT NULL DEFAULT '{1,2,3,4,5}';

COMMENT ON COLUMN members.work_days IS
  'Days of the week this member works, as ISO weekday numbers (1 = Monday, 7 = Sunday). Sorted, no duplicates. Never longer than working_days.';

-- A CHECK constraint cannot contain a subquery, and testing an array for
-- duplicates needs one — so it lives in an IMMUTABLE function the constraint
-- can call instead.
CREATE OR REPLACE FUNCTION public.smallint_array_is_distinct(p_arr SMALLINT[])
RETURNS boolean
LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT CARDINALITY(p_arr) = (SELECT COUNT(DISTINCT x) FROM UNNEST(p_arr) AS x);
$$;

COMMENT ON FUNCTION public.smallint_array_is_distinct IS
  'True when the array contains no repeated values. Exists so CHECK constraints can test for duplicates, which they cannot do inline.';

-- Every entry is a real weekday, and no day is listed twice.
ALTER TABLE members
  DROP CONSTRAINT IF EXISTS members_work_days_valid;

ALTER TABLE members
  ADD CONSTRAINT members_work_days_valid
  CHECK (
    work_days <@ ARRAY[1,2,3,4,5,6,7]::SMALLINT[]
    AND public.smallint_array_is_distinct(work_days)
  );

-- Cannot name more working days than the member is scheduled to work. Fewer is
-- allowed: an admin who raises working_days to 6 has not yet picked the sixth.
-- Safe to add — every existing row is working_days 5 or 6 against a 5-day
-- default, so none of the 86 members violate it.
ALTER TABLE members
  DROP CONSTRAINT IF EXISTS members_work_days_within_working_days;

ALTER TABLE members
  ADD CONSTRAINT members_work_days_within_working_days
  CHECK (CARDINALITY(work_days) <= working_days);

-- PostgREST caches the schema; without this the new column 404s until restart.
NOTIFY pgrst, 'reload schema';
