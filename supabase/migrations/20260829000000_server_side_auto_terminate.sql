-- ==============================================================
-- Server-Side Auto-Terminate Session
-- Auto-closes unended sessions (ended_at IS NULL) if continuous
-- inactivity or missing heartbeats exceeds the Organization's
-- "Termination Grace Period" (idleAutoStopMinutes).
-- ==============================================================

CREATE OR REPLACE FUNCTION public.rpc_auto_terminate_inactive_sessions(p_org_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_closed_count integer := 0;
    v_closed_sessions jsonb := '[]'::jsonb;
    v_auto_stop_enabled boolean;
    v_grace_period_mins integer;
    v_last_sample RECORD;
    v_last_active_time timestamptz;
    v_trailing_idle_mins integer;
    v_now timestamptz := now();
BEGIN
    -- Loop through all open/unended sessions (optionally scoped to an organization)
    FOR v_session IN
        SELECT 
            s.id AS session_id,
            s.user_id,
            s.organization_id,
            s.started_at,
            o.settings AS org_settings
        FROM public.sessions s
        LEFT JOIN public.organizations o ON o.id = s.organization_id
        WHERE s.ended_at IS NULL
          AND s.manual = false
          AND (p_org_id IS NULL OR s.organization_id = p_org_id)
    LOOP
        -- 1. Read org-level Auto-Terminate settings
        v_auto_stop_enabled := COALESCE((v_session.org_settings->>'autoStopOnIdle')::boolean, false);
        v_grace_period_mins := COALESCE((v_session.org_settings->>'idleAutoStopMinutes')::integer, 60);

        -- If the org explicitly has auto-terminate enabled and a valid grace period
        IF v_auto_stop_enabled AND v_grace_period_mins > 0 THEN
            
            -- Find the latest sample received for this session
            SELECT 
                MAX(recorded_at) AS latest_sample_at,
                COUNT(*) AS total_samples
            INTO v_last_sample
            FROM public.activity_samples
            WHERE session_id = v_session.session_id;

            -- Case A: Session has no samples at all and has been running longer than grace period
            IF v_last_sample.total_samples = 0 OR v_last_sample.latest_sample_at IS NULL THEN
                IF v_now - v_session.started_at >= (v_grace_period_mins * interval '1 minute') THEN
                    -- Close at started_at + 1 minute
                    UPDATE public.sessions
                    SET ended_at = v_session.started_at + interval '1 minute'
                    WHERE id = v_session.session_id AND ended_at IS NULL;

                    v_closed_count := v_closed_count + 1;
                    v_closed_sessions := v_closed_sessions || jsonb_build_object(
                        'session_id', v_session.session_id,
                        'reason', 'no_samples_exceeded_grace_period',
                        'ended_at', v_session.started_at + interval '1 minute'
                    );
                END IF;

            -- Case B: Power cut / Disconnect / Crash — no sample received for >= grace_period
            -- Or Case C: Trailing continuous non-activity samples >= grace_period
            ELSE
                -- Check how long since the last heartbeat sample arrived
                IF v_now - v_last_sample.latest_sample_at >= (v_grace_period_mins * interval '1 minute') THEN
                    -- Find the last genuinely active sample
                    SELECT MAX(recorded_at)
                    INTO v_last_active_time
                    FROM public.activity_samples
                    WHERE session_id = v_session.session_id
                      AND (COALESCE(mouse_clicks, 0) > 0 OR COALESCE(key_presses, 0) > 0 OR idle = false);

                    -- If active sample found, end at that sample + 1 min buffer; otherwise at start + 1 min
                    IF v_last_active_time IS NOT NULL THEN
                        UPDATE public.sessions
                        SET ended_at = LEAST(v_now, v_last_active_time + interval '1 minute')
                        WHERE id = v_session.session_id AND ended_at IS NULL;
                    ELSE
                        UPDATE public.sessions
                        SET ended_at = v_session.started_at + interval '1 minute'
                        WHERE id = v_session.session_id AND ended_at IS NULL;
                    END IF;

                    v_closed_count := v_closed_count + 1;
                    v_closed_sessions := v_closed_sessions || jsonb_build_object(
                        'session_id', v_session.session_id,
                        'reason', 'heartbeat_stopped_exceeded_grace_period',
                        'ended_at', COALESCE(v_last_active_time + interval '1 minute', v_session.started_at + interval '1 minute')
                    );

                ELSE
                    -- Samples are still arriving or recent: check for trailing continuous zero-activity block
                    -- Count consecutive trailing 0-activity samples
                    WITH ranked_samples AS (
                        SELECT 
                            recorded_at,
                            mouse_clicks,
                            key_presses,
                            idle,
                            ROW_NUMBER() OVER (ORDER BY recorded_at DESC) as rn
                        FROM public.activity_samples
                        WHERE session_id = v_session.session_id
                    ),
                    first_active AS (
                        SELECT MIN(rn) as active_rn
                        FROM ranked_samples
                        WHERE (COALESCE(mouse_clicks, 0) > 0 OR COALESCE(key_presses, 0) > 0 OR idle = false)
                    )
                    SELECT COALESCE(
                        (SELECT active_rn - 1 FROM first_active WHERE active_rn IS NOT NULL),
                        (SELECT COUNT(*) FROM ranked_samples)
                    ) INTO v_trailing_idle_mins;

                    -- If trailing dead minutes exceed or equal the org grace period, force terminate
                    IF v_trailing_idle_mins >= v_grace_period_mins THEN
                        SELECT MAX(recorded_at)
                        INTO v_last_active_time
                        FROM public.activity_samples
                        WHERE session_id = v_session.session_id
                          AND (COALESCE(mouse_clicks, 0) > 0 OR COALESCE(key_presses, 0) > 0 OR idle = false);

                        IF v_last_active_time IS NOT NULL THEN
                            UPDATE public.sessions
                            SET ended_at = v_last_active_time + interval '1 minute'
                            WHERE id = v_session.session_id AND ended_at IS NULL;
                        ELSE
                            UPDATE public.sessions
                            SET ended_at = v_session.started_at + interval '1 minute'
                            WHERE id = v_session.session_id AND ended_at IS NULL;
                        END IF;

                        v_closed_count := v_closed_count + 1;
                        v_closed_sessions := v_closed_sessions || jsonb_build_object(
                            'session_id', v_session.session_id,
                            'reason', 'continuous_inactivity_exceeded_grace_period',
                            'ended_at', COALESCE(v_last_active_time + interval '1 minute', v_session.started_at + interval '1 minute')
                        );
                    END IF;
                END IF;
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'closed_count', v_closed_count,
        'closed_sessions', v_closed_sessions
    );
END;
$$;
