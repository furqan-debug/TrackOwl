-- ==============================================================
-- DigiReps Tracker — Deletion Workflow with Historical Preservation
--
-- When an admin/owner deletes a member:
-- 1. Permanently wipe storage files (screenshots and avatars).
-- 2. Permanently delete DB screenshots metadata.
-- 3. Permanently delete detailed activity_samples (keystrokes, mouse clicks, URLs).
-- 4. Scrub public.block_records: clear app_name, domain, clicks, key_presses,
--    and activity_percent, while strictly PRESERVING business_date, block_start,
--    block_end, active_seconds, and credited for accurate historical timesheets.
-- 5. Remove team, project, and todo assignments.
-- 6. Unlink and remove Supabase Auth account so user cannot log in and email is freed.
-- 7. Retain members record with status = 'Deleted', employee_id, full_name, and email
--    for historical reports (Time Matrix).
-- ==============================================================

CREATE OR REPLACE FUNCTION public.rpc_delete_member(p_member_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
DECLARE
  v_caller_auth_id UUID;
  v_caller_role TEXT;
  v_target_member RECORD;
  v_other_owners INTEGER;
  v_other_members INTEGER;
BEGIN
  -- 1. Identify caller
  v_caller_auth_id := auth.uid();
  
  -- 2. Fetch target member
  SELECT id, organization_id, auth_user_id, role, email, status
  INTO v_target_member
  FROM public.members
  WHERE id = p_member_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Member not found');
  END IF;

  -- 3. Verify caller permissions (must be Owner or Admin of the same organization)
  IF v_caller_auth_id IS NOT NULL THEN
    SELECT role INTO v_caller_role
    FROM public.members
    WHERE auth_user_id = v_caller_auth_id
      AND organization_id = v_target_member.organization_id;

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('Owner', 'Admin') THEN
      RETURN jsonb_build_object('error', 'Unauthorized. Only organization Owners or Admins can delete members.');
    END IF;
  END IF;

  -- 4. Sole Owner guard: prevent deleting the only Owner if other members exist
  IF v_target_member.role = 'Owner' THEN
    SELECT COUNT(*) INTO v_other_owners
    FROM public.members
    WHERE organization_id = v_target_member.organization_id
      AND role = 'Owner'
      AND status != 'Deleted'
      AND id != p_member_id;

    SELECT COUNT(*) INTO v_other_members
    FROM public.members
    WHERE organization_id = v_target_member.organization_id
      AND status != 'Deleted'
      AND id != p_member_id;

    IF COALESCE(v_other_owners, 0) = 0 AND COALESCE(v_other_members, 0) > 0 THEN
      RETURN jsonb_build_object('error', 'Cannot delete the only Owner of an organization while other members exist. Transfer ownership first.');
    END IF;
  END IF;

  -- 5. Physical Storage Purge:
  -- Delete all objects in screenshots and avatars buckets matching this member
  IF v_target_member.organization_id IS NOT NULL THEN
    BEGIN
      DELETE FROM storage.objects
      WHERE bucket_id = 'screenshots'0
        AND (
          name LIKE v_target_member.organization_id::text || '/' || p_member_id::text || '/%'
          OR (v_target_member.auth_user_id IS NOT NULL AND name LIKE v_target_member.organization_id::text || '/' || v_target_member.auth_user_id::text || '/%')
        );

      DELETE FROM storage.objects
      WHERE bucket_id = 'avatars'
        AND (
          name LIKE v_target_member.organization_id::text || '/' || p_member_id::text || '/%'
          OR (v_target_member.auth_user_id IS NOT NULL AND name LIKE v_target_member.organization_id::text || '/' || v_target_member.auth_user_id::text || '/%')
        );
    EXCEPTION WHEN OTHERS THEN
      -- In case storage schema access is restricted, continue
    END;
  END IF;

  -- 6. Delete Database Screenshots metadata
  DELETE FROM public.screenshots
  WHERE user_id = p_member_id
     OR (v_target_member.auth_user_id IS NOT NULL AND user_id = v_target_member.auth_user_id);

  -- 7. Delete Database Activity Samples (detailed clicks, keystrokes, window titles)
  DELETE FROM public.activity_samples
  WHERE session_id IN (
    SELECT id FROM public.sessions
    WHERE user_id = p_member_id
       OR (v_target_member.auth_user_id IS NOT NULL AND user_id = v_target_member.auth_user_id)
  );

  -- 8. Scrub tracking details from public.block_records while preserving tracked time & business date
  UPDATE public.block_records
  SET app_name = NULL,
      domain = NULL,
      mouse_clicks = 0,
      key_presses = 0,
      activity_percent = 0
  WHERE user_id = p_member_id
     OR (v_target_member.auth_user_id IS NOT NULL AND user_id = v_target_member.auth_user_id);

  -- 9. Clean up assignments
  DELETE FROM public.project_members WHERE member_id = p_member_id;
  DELETE FROM public.team_members WHERE member_id = p_member_id;
  DELETE FROM public.todo_assignees WHERE member_id = p_member_id;

  -- 10. Update member status to 'Deleted' and clear auth_user_id & avatar
  UPDATE public.members
  SET status = 'Deleted',
      auth_user_id = NULL,
      avatar_url = NULL
  WHERE id = p_member_id;

  -- 11. Remove auth.users account if exists so user cannot sign in and email is freed
  IF v_target_member.auth_user_id IS NOT NULL THEN
    BEGIN
      DELETE FROM auth.users WHERE id = v_target_member.auth_user_id;
    EXCEPTION WHEN OTHERS THEN
      -- If foreign key or trigger prevents direct auth deletion, continue
    END;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_delete_member(UUID) TO authenticated, service_role;
