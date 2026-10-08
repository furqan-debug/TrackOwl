import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  });
}

/** Recursively remove all files in a storage folder */
async function purgeFolder(admin: any, bucket: string, prefix: string) {
  for (;;) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 100 });
    if (error) {
      console.warn(`list ${bucket}/${prefix}: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) return;

    const files: string[] = [];
    for (const entry of data) {
      const path = `${prefix}/${entry.name}`;
      if (entry.id === null || entry.id === undefined) {
        await purgeFolder(admin, bucket, path);
      } else {
        files.push(path);
      }
    }

    if (files.length === 0) return;
    const { error: rmErr } = await admin.storage.from(bucket).remove(files);
    if (rmErr) {
      console.warn(`remove from ${bucket}: ${rmErr.message}`);
      return;
    }
    if (data.length < 100) return;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'Not signed in.' }, 401);
  }

  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  });
  const { data: { user: callerUser }, error: userErr } = await asUser.auth.getUser();
  if (userErr || !callerUser) {
    return json({ error: 'Your session has expired. Please sign in again.' }, 401);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const body = await req.json().catch(() => ({}));
  const memberId = body?.memberId;
  if (!memberId) {
    return json({ error: 'memberId is required' }, 400);
  }

  // 1. Fetch target member
  const { data: targetMember, error: targetErr } = await admin
    .from('members')
    .select('id, organization_id, auth_user_id, role, email, status')
    .eq('id', memberId)
    .maybeSingle();

  if (targetErr || !targetMember) {
    return json({ error: 'Member not found.' }, 404);
  }

  // 2. Fetch caller member record
  const { data: callerMember, error: callerErr } = await admin
    .from('members')
    .select('id, organization_id, role')
    .eq('auth_user_id', callerUser.id)
    .eq('organization_id', targetMember.organization_id)
    .maybeSingle();

  if (callerErr || !callerMember || !['Owner', 'Admin'].includes(callerMember.role)) {
    return json({ error: 'Unauthorized. Only organization Owners and Admins can delete members.' }, 403);
  }

  // 3. Sole Owner guard
  if (targetMember.role === 'Owner') {
    const { count: otherOwners } = await admin
      .from('members')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', targetMember.organization_id)
      .eq('role', 'Owner')
      .neq('status', 'Deleted')
      .neq('id', targetMember.id);

    const { count: otherMembers } = await admin
      .from('members')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', targetMember.organization_id)
      .neq('status', 'Deleted')
      .neq('id', targetMember.id);

    if ((otherOwners ?? 0) === 0 && (otherMembers ?? 0) > 0) {
      return json({
        error: 'Cannot delete the only Owner of an organization while other members exist. Transfer ownership first.'
      }, 409);
    }
  }

  const orgId = targetMember.organization_id;

  // 4. Purge storage files (screenshots and avatars)
  if (orgId) {
    await purgeFolder(admin, 'avatars', `${orgId}/${targetMember.id}`);
    await purgeFolder(admin, 'screenshots', `${orgId}/${targetMember.id}`);
    if (targetMember.auth_user_id) {
      await purgeFolder(admin, 'avatars', `${orgId}/${targetMember.auth_user_id}`);
      await purgeFolder(admin, 'screenshots', `${orgId}/${targetMember.auth_user_id}`);
    }
  }

  // 5. Run Database deep purge
  const { error: rpcErr } = await admin.rpc('rpc_delete_member', { p_member_id: targetMember.id });
  if (rpcErr) {
    console.error('rpc_delete_member error:', rpcErr.message);
    // If rpc does not exist yet or threw, execute queries directly:
    await admin.from('screenshots').delete().eq('user_id', targetMember.id);
    const { data: memberSessions } = await admin.from('sessions').select('id').eq('user_id', targetMember.id);
    if (memberSessions && memberSessions.length > 0) {
      const sessIds = memberSessions.map((s: any) => s.id);
      await admin.from('activity_samples').delete().in('session_id', sessIds);
    }
    await admin.from('block_records')
      .update({ app_name: null, domain: null, mouse_clicks: 0, key_presses: 0, activity_percent: 0 })
      .eq('user_id', targetMember.id);
    await admin.from('project_members').delete().eq('member_id', targetMember.id);
    await admin.from('team_members').delete().eq('member_id', targetMember.id);
    await admin.from('todo_assignees').delete().eq('member_id', targetMember.id);
    await admin.from('members').update({ status: 'Deleted', auth_user_id: null, avatar_url: null }).eq('id', targetMember.id);
  }

  // 6. Delete user login from Supabase Auth
  if (targetMember.auth_user_id) {
    const { error: delAuthErr } = await admin.auth.admin.deleteUser(targetMember.auth_user_id);
    if (delAuthErr) {
      console.warn('deleteUser auth error:', delAuthErr.message);
    }
  }

  return json({ success: true });
});
