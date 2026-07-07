-- Create rpc_stop_session_v2 to accept ended_at parameter (required for offline sync)
CREATE OR REPLACE FUNCTION public.rpc_stop_session_v2(p_session_id uuid, p_ended_at timestamptz)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.sessions
    SET ended_at = p_ended_at
    WHERE id = p_session_id 
    AND ended_at IS NULL;

    RETURN json_build_object(
        'id', p_session_id,
        'ended_at', p_ended_at
    );
END;
$$;
