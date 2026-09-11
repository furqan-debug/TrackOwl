-- =============================================================================
-- Refuse to open a session on a day the member is not scheduled to work
--
-- The desktop client checks this before it calls, but a client check is a
-- courtesy, not an enforcement — it can be stale, patched, or simply an older
-- build. This is the layer that actually holds.
--
-- THE DAY IS DECIDED IN THE ORGANIZATION'S TIMEZONE, not the member's and not
-- the server's. A distributed team gets one answer to "is today Saturday", the
-- same rule that already attributes tracked minutes to organization days.
-- Falls back to UTC when an organization has no orgTimezone set.
--
-- An empty work_days means "not configured" and allows tracking. Locking a
-- member out because nobody filled in their schedule would be worse than the
-- problem this solves.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_start_session(
    p_user_id uuid,
    p_project_id text DEFAULT NULL::text,
    p_organization_id uuid DEFAULT NULL::uuid,
    p_ip_address text DEFAULT NULL::text,
    p_app_version text DEFAULT NULL::text,
    p_os_platform text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_session_id uuid;
    v_now timestamptz := now();
    v_member_status text;
    v_unclosed_id uuid;
    v_last_activity timestamptz;
    v_work_days smallint[];
    v_org_tz text;
    v_today smallint;
BEGIN
    -- 1. Ensure the user is Active
    SELECT status, work_days INTO v_member_status, v_work_days
    FROM public.members WHERE id = p_user_id;

    IF v_member_status != 'Active' THEN
        RAISE EXCEPTION 'Your account is deactivated. You cannot start tracking time.';
    END IF;

    -- 1b. Ensure today is one of the member's scheduled working days.
    IF v_work_days IS NOT NULL AND CARDINALITY(v_work_days) > 0 THEN
        SELECT COALESCE(o.settings->>'orgTimezone', 'UTC')
        INTO v_org_tz
        FROM public.organizations o
        WHERE o.id = COALESCE(
            p_organization_id,
            (SELECT organization_id FROM public.members WHERE id = p_user_id)
        );

        -- A timezone the database does not recognise must not block anyone, so
        -- an unknown zone degrades to UTC rather than raising.
        BEGIN
            v_today := EXTRACT(ISODOW FROM v_now AT TIME ZONE COALESCE(v_org_tz, 'UTC'))::smallint;
        EXCEPTION WHEN OTHERS THEN
            v_today := EXTRACT(ISODOW FROM v_now AT TIME ZONE 'UTC')::smallint;
        END;

        IF NOT (v_today = ANY(v_work_days)) THEN
            RAISE EXCEPTION '% is not one of your scheduled working days. Tracking is unavailable today.',
                TO_CHAR(v_now AT TIME ZONE COALESCE(v_org_tz, 'UTC'), 'FMDay');
        END IF;
    END IF;

    -- 2. Close ALL open sessions for this user, one at a time, using last sample time as end time
    --    We lock the rows with FOR UPDATE to prevent concurrent inserts racing this cleanup.
    FOR v_unclosed_id IN
        SELECT id FROM public.sessions
        WHERE user_id = p_user_id AND ended_at IS NULL
        FOR UPDATE
    LOOP
        -- Find the last recorded activity sample for this open session
        SELECT MAX(recorded_at) INTO v_last_activity
        FROM public.activity_samples
        WHERE session_id = v_unclosed_id;

        -- End at last sample (or started_at + 1min if no samples ever recorded)
        UPDATE public.sessions
        SET ended_at = LEAST(
            v_now - interval '1 second',
            COALESCE(v_last_activity, started_at + interval '1 minute')
        )
        WHERE id = v_unclosed_id;

        RAISE NOTICE '[rpc_start_session] Closed orphaned session % at %', v_unclosed_id, COALESCE(v_last_activity, v_now);
    END LOOP;

    -- 3. Now that all open sessions are closed, insert the new session cleanly.
    --    The partial unique index unique_active_session_per_user guarantees
    --    only one open session can exist per user at a time.
    INSERT INTO public.sessions (
        user_id,
        project_id,
        organization_id,
        ip_address,
        started_at,
        ended_at,
        app_version,
        os_platform
    )
    VALUES (
        p_user_id,
        p_project_id,
        p_organization_id,
        p_ip_address,
        v_now,
        NULL,
        p_app_version,
        p_os_platform
    )
    RETURNING id INTO v_session_id;

    RETURN json_build_object(
        'id', v_session_id,
        'started_at', v_now
    );
END;
$function$;

COMMENT ON FUNCTION public.rpc_start_session IS
  'Opens a tracking session. Refuses if the member is not Active, or if today - in the organization timezone - is not one of their work_days. Closes any orphaned open sessions first.';

NOTIFY pgrst, 'reload schema';
