-- =============================================
-- DigiReps Tracker — Time Reporting Fixes
-- Addresses discrepancy between sample-counting and timestamp-math,
-- safely handles offline crash recovery with an audit trail,
-- and unifies manual time.
-- =============================================

-- 1. Add `original_ended_at` column to `sessions`
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS original_ended_at TIMESTAMPTZ;

-- Backfill legacy sessions
UPDATE sessions SET original_ended_at = ended_at WHERE ended_at IS NOT NULL AND original_ended_at IS NULL;

-- 2. Create trigger to automatically populate `original_ended_at` upon first closure
CREATE OR REPLACE FUNCTION public.trg_set_original_ended_at()
RETURNS TRIGGER 
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
        NEW.original_ended_at = NEW.ended_at;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_original_ended_at ON sessions;
CREATE TRIGGER trg_set_original_ended_at
BEFORE UPDATE ON sessions
FOR EACH ROW
EXECUTE FUNCTION trg_set_original_ended_at();

-- 3. Create the `session_corrections` audit table
CREATE TABLE IF NOT EXISTS session_corrections (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    old_ended_at TIMESTAMPTZ,
    new_ended_at TIMESTAMPTZ,
    corrected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL, -- 'Applied' | 'Rejected_OutOfBounds'
    reason TEXT
);

-- Enable RLS to secure the audit table from direct client access
ALTER TABLE session_corrections ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_session_corrections_session ON session_corrections(session_id);

-- 4. Bounded Retroactive Ghost Session Closure Trigger
CREATE OR REPLACE FUNCTION public.trg_expand_session_ended_at()
RETURNS TRIGGER 
SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID;
    v_ended_at TIMESTAMPTZ;
    v_original_ended_at TIMESTAMPTZ;
    v_new_ended_at TIMESTAMPTZ;
BEGIN
    -- Fetch the session
    SELECT id, ended_at, original_ended_at 
    INTO v_session_id, v_ended_at, v_original_ended_at
    FROM sessions 
    WHERE id = NEW.session_id;

    -- If session is closed and the new sample is later than the current ended_at
    IF v_ended_at IS NOT NULL AND NEW.recorded_at > v_ended_at THEN
        
        -- Check the 7-day bound against the original close time
        IF (NEW.recorded_at - v_original_ended_at) < interval '7 days' THEN
            -- Expand the session
            UPDATE sessions 
            SET ended_at = NEW.recorded_at 
            WHERE id = v_session_id;

            -- Log to audit table
            INSERT INTO session_corrections (session_id, old_ended_at, new_ended_at, status, reason)
            VALUES (v_session_id, v_ended_at, NEW.recorded_at, 'Applied', 'Late arriving sample expanded session');
        ELSE
            -- Log rejection
            INSERT INTO session_corrections (session_id, old_ended_at, new_ended_at, status, reason)
            VALUES (v_session_id, v_ended_at, NEW.recorded_at, 'Rejected_OutOfBounds', 'Late arriving sample exceeded 7-day bound');
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_expand_session_ended_at ON activity_samples;
CREATE TRIGGER trg_expand_session_ended_at
AFTER INSERT ON activity_samples
FOR EACH ROW
EXECUTE FUNCTION trg_expand_session_ended_at();
