require('dotenv').config();
require('dotenv').config({ path: require('path').resolve(__dirname, 'supabase/.env') });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey || !anonKey) {
    console.error("Missing environment variables. Please check your .env files.");
    process.exit(1);
}

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

    const userSupabase = createClient(supabaseUrl, anonKey, {
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
