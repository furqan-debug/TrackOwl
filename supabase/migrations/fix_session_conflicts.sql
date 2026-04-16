-- =============================================
-- DigiReps Tracker — Safe Session Creation Fix
-- Ensures only one active session per user.
-- Use this by calling rpc('rpc_start_session', ...)
-- =============================================

-- 1. Ensure the unique index exists (Only one NULL ended_at per user)
DROP INDEX IF EXISTS unique_active_session_per_user;
CREATE UNIQUE INDEX unique_active_session_per_user ON sessions (user_id) WHERE (ended_at IS NULL);

-- 2. Create/Update the atomic start function (Hardened)
CREATE OR REPLACE FUNCTION public.rpc_start_session(
    p_user_id text, 
    p_project_id text DEFAULT NULL, 
    p_organization_id uuid DEFAULT NULL, 
    p_ip_address text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id uuid;
    v_now timestamptz := now();
BEGIN
    -- 1. Close any older sessions (just in case)
    UPDATE public.sessions
    SET ended_at = v_now
    WHERE user_id = p_user_id 
    AND ended_at IS NULL;

    -- 2. Upsert the active session for this user
    -- We use ON CONFLICT to handle race conditions where two start calls happen simultaneously.
    INSERT INTO public.sessions (
        user_id,
        project_id,
        organization_id,
        ip_address,
        started_at,
        ended_at
    )
    VALUES (
        p_user_id,
        p_project_id,
        p_organization_id,
        p_ip_address,
        v_now,
        NULL
    )
    ON CONFLICT (user_id) WHERE (ended_at IS NULL)
    DO UPDATE SET 
        project_id = EXCLUDED.project_id,
        organization_id = EXCLUDED.organization_id,
        ip_address = EXCLUDED.ip_address,
        started_at = EXCLUDED.started_at,
        started_at = v_now -- Ensure the NEW start time is used even if updating
    RETURNING id INTO v_session_id;

    RETURN json_build_object(
        'id', v_session_id,
        'started_at', v_now
    );
END;
$$;


-- 3. Create/Update the stop function
CREATE OR REPLACE FUNCTION public.rpc_stop_session(p_session_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_now timestamptz := now();
BEGIN
    UPDATE public.sessions
    SET ended_at = v_now
    WHERE id = p_session_id 
    AND ended_at IS NULL;

    RETURN json_build_object(
        'id', p_session_id,
        'ended_at', v_now
    );
END;
$$;
