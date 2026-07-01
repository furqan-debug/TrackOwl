const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lgmggbnaoyoapxqsfgzv.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnbWdnYm5hb3lvYXB4cXNmZ3p2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU1MzE0MiwiZXhwIjoyMDg4MTI5MTQyfQ.SAPAT4OpGOAGmj2cTGHiprG--Lapj5bx5GezGF1PUy4';

const supabase = createClient(supabaseUrl, serviceKey);

async function testRpc() {
    const userEmail = 'furqan@digireps.co';
    console.log("1. Generating magic link/token for:", userEmail);
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: userEmail
    });
    if (linkErr) {
        console.error(linkErr);
        return;
    }
    const token = new URL(linkData.properties.action_link).searchParams.get('token');
    const { data: sessionData, error: sessionErr } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'magiclink'
    });
    if (sessionErr) {
        console.error(sessionErr);
        return;
    }
    const userToken = sessionData.session.access_token;
    console.log("Token acquired!");

    const userSupabase = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnbWdnYm5hb3lvYXB4cXNmZ3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NTMxNDIsImV4cCI6MjA4ODEyOTE0Mn0.GkzsADYd-kpJYTgY9EZGwgy5kvN6nyYmfVoLUHRJQI4', {
        global: {
            headers: {
                Authorization: `Bearer ${userToken}`
            }
        }
    });

    console.log("\n2. Calling get_dashboard_metrics RPC...");
    const { data: aggregated, error: rpcErr } = await userSupabase.rpc('get_dashboard_metrics', {
        p_org_id: 'aeceb4fc-1d4e-4083-9ae8-1f6a6bd0c404',
        p_start_iso: '2026-05-01T00:00:00Z',
        p_end_iso: '2026-05-07T23:59:59Z',
        p_prev_start_iso: '2026-04-24T00:00:00Z',
        p_prev_end_iso: '2026-04-30T23:59:59Z',
        p_member_ids: null,
        p_project_ids: null
    });
    if (rpcErr) {
        console.error("RPC Error:", rpcErr);
    } else {
        console.log("RPC Aggregated Metrics:", aggregated);
    }
}

testRpc();
