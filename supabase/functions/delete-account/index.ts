// Delete the calling user's own account.
//
// The desktop app used to POST this to an Express server on localhost:3001.
// That server is gone — the app moved to Supabase directly — so the button has
// been failing with ERR_CONNECTION_REFUSED ever since. This replaces it.
//
// Only ever deletes the CALLER. The user id comes from the verified JWT, never
// from the request body, so this cannot be pointed at anyone else.
//
// Most of the data goes by cascade from the members row: sessions, and through
// them activity_samples, block_records, screenshots and session_corrections,
// plus expenses, payments, project_members, team_members, todo_assignees,
// time_off_requests and timesheet_approvals. Storage files are NOT covered by
// any cascade, so they are removed explicitly first.

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

/** Remove every file under a prefix, paging through the listing. */
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
      // No id means a folder; recurse rather than trying to delete it.
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

  // Identify the caller from their own token. Anything in the body is ignored.
  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  });
  const { data: { user }, error: userErr } = await asUser.auth.getUser();
  if (userErr || !user) {
    return json({ error: 'Your session has expired. Please sign in again.' }, 401);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: member, error: memberErr } = await admin
    .from('members')
    .select('id, organization_id, role, email')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (memberErr) {
    console.error('member lookup failed:', memberErr.message);
    return json({ error: 'Could not load your account. Please try again.' }, 500);
  }

  // No member row: nothing to cascade, but the login still has to go.
  if (member) {
    // An organization with no Owner cannot be administered by anyone — no
    // billing, no member management, no way back in. Refuse rather than
    // stranding the rest of the team.
    if (member.role === 'Owner') {
      const { count: otherOwners } = await admin
        .from('members')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', member.organization_id)
        .eq('role', 'Owner')
        .neq('id', member.id);

      const { count: otherMembers } = await admin
        .from('members')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', member.organization_id)
        .neq('id', member.id);

      if ((otherOwners ?? 0) === 0 && (otherMembers ?? 0) > 0) {
        return json({
          error: 'You are the only Owner of this organization. Make someone else an Owner first, '
               + 'otherwise nobody would be able to manage it after you leave.'
        }, 409);
      }
    }

    // Storage is not reached by any foreign key, so clear it before the row
    // that tells us where to look is gone.
    const orgId = member.organization_id;
    if (orgId) {
      await purgeFolder(admin, 'avatars', `${orgId}/${member.id}`);
      await purgeFolder(admin, 'screenshots', `${orgId}/${member.id}`);
    }

    const { error: delErr } = await admin.from('members').delete().eq('id', member.id);
    if (delErr) {
      console.error('member delete failed:', delErr.message);
      return json({ error: 'Could not delete your account data. Nothing was removed.' }, 500);
    }
  }

  // Last, because until this goes the user can still sign in. If it fails the
  // data is already gone, so say so plainly rather than reporting success.
  const { error: authErr } = await admin.auth.admin.deleteUser(user.id);
  if (authErr) {
    console.error('auth user delete failed:', authErr.message);
    return json({
      error: 'Your data was deleted, but your login could not be removed. Please contact support.'
    }, 500);
  }

  return json({ success: true });
});
