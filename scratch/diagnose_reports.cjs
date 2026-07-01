const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lgmggbnaoyoapxqsfgzv.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnbWdnYm5hb3lvYXB4cXNmZ3p2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU1MzE0MiwiZXhwIjoyMDg4MTI5MTQyfQ.SAPAT4OpGOAGmj2cTGHiprG--Lapj5bx5GezGF1PUy4';

const supabase = createClient(supabaseUrl, serviceKey);
global.serviceSupabase = supabase;

// Copy fetchAllActivitySamples logic
async function fetchAllActivitySamples(
    supabase,
    startIso,
    endIso,
    selectQuery = '*',
    filters
) {
    const PAGE_SIZE = 1000;
    
    console.time("  -> Count query (User with RLS)");
    let countQuery = supabase
        .from('activity_samples')
        .select('*', { count: 'exact', head: true })
        .gte('recorded_at', startIso)
        .lte('recorded_at', endIso);

    if (filters?.organizationId) {
        countQuery = countQuery.eq('organization_id', filters.organizationId);
    }
    if (filters?.sessionIds && filters.sessionIds.length > 0) {
        countQuery = countQuery.in('session_id', filters.sessionIds);
    }

    const { count, error: countErr } = await countQuery;
    console.timeEnd("  -> Count query (User with RLS)");

    // Run the same query using the service role client
    console.time("  -> Count query (Service Role - bypass RLS)");
    let serviceCountQuery = global.serviceSupabase
        .from('activity_samples')
        .select('*', { count: 'exact', head: true })
        .gte('recorded_at', startIso)
        .lte('recorded_at', endIso);

    if (filters?.organizationId) {
        serviceCountQuery = serviceCountQuery.eq('organization_id', filters.organizationId);
    }
    if (filters?.sessionIds && filters.sessionIds.length > 0) {
        serviceCountQuery = serviceCountQuery.in('session_id', filters.sessionIds);
    }

    const { count: sCount, error: sErr } = await serviceCountQuery;
    console.timeEnd("  -> Count query (Service Role - bypass RLS)");

    if (countErr || count === null) {
        console.error("Error fetching sample count:", countErr);
        return [];
    }

    console.log(`  -> Found ${count} total activity samples (Pages: ${Math.ceil(count / PAGE_SIZE)})`);
    if (count === 0) return [];

    const totalPages = Math.ceil(count / PAGE_SIZE);
    const BATCH_SIZE = 100;
    const allSamples = [];

    console.time(`  -> Parallel fetching of ${totalPages} pages`);
    for (let i = 0; i < totalPages; i += BATCH_SIZE) {
        const batchPromises = [];
        for (let j = i; j < Math.min(i + BATCH_SIZE, totalPages); j++) {
            let query = supabase
                .from('activity_samples')
                .select(selectQuery)
                .gte('recorded_at', startIso)
                .lte('recorded_at', endIso)
                .order('recorded_at', { ascending: true })
                .range(j * PAGE_SIZE, (j + 1) * PAGE_SIZE - 1);

            if (filters?.organizationId) {
                query = query.eq('organization_id', filters.organizationId);
            }
            if (filters?.sessionIds && filters.sessionIds.length > 0) {
                query = query.in('session_id', filters.sessionIds);
            }

            batchPromises.push(query);
        }

        const results = await Promise.all(batchPromises);
        results.forEach(res => {
            if (res.data) allSamples.push(...res.data);
            if (res.error) console.error("Error fetching batch page:", res.error);
        });
    }
    console.timeEnd(`  -> Parallel fetching of ${totalPages} pages`);

    return allSamples;
}

async function runDiagnosis() {
    const userEmail = 'furqan@digireps.co';
    console.log("1. Generating session token for:", userEmail);
    const { data: linkData } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: userEmail
    });
    const token = new URL(linkData.properties.action_link).searchParams.get('token');
    const { data: authSessionData } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'magiclink'
    });
    const userToken = authSessionData.session.access_token;
    console.log("Token acquired!");

    const userSupabase = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnbWdnYm5hb3lvYXB4cXNmZ3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NTMxNDIsImV4cCI6MjA4ODEyOTE0Mn0.GkzsADYd-kpJYTgY9EZGwgy5kvN6nyYmfVoLUHRJQI4', {
        global: {
            headers: {
                Authorization: `Bearer ${userToken}`
            }
        }
    });

    const organizationId = 'aeceb4fc-1d4e-4083-9ae8-1f6a6bd0c404';
    const start = '2026-05-01T00:00:00.000Z';
    const end = '2026-05-07T23:59:59.999Z';

    console.log("\n2. Fetching members...");
    console.time("Members query");
    const { data: members } = await userSupabase.from('members')
        .select('id, full_name, timezone, idle_limit, auth_user_id')
        .eq('organization_id', organizationId);
    console.timeEnd("Members query");
    console.log(`Fetched ${members?.length} members.`);

    const allMemberSessionUserIds = Array.from(
        new Set(members.flatMap((m) => [m.id, m.auth_user_id].filter(Boolean)))
    );

    console.log("\n3. Fetching sessions...");
    console.time("Sessions query");
    let sessionsQuery = userSupabase
        .from('sessions')
        .select('id, user_id, started_at, ended_at')
        .lt('started_at', end)
        .or(`ended_at.is.null,ended_at.gt.${start}`)
        .eq('organization_id', organizationId)
        .in('user_id', allMemberSessionUserIds);
    const { data: sessionData } = await sessionsQuery;
    console.timeEnd("Sessions query");
    console.log(`Fetched ${sessionData?.length} sessions.`);

    const activeSessionIds = sessionData.map(s => s.id);

    console.log("\n4. Fetching screenshots count...");
    console.time("Screenshots count query");
    let ssQuery = userSupabase
        .from('screenshots')
        .select('id', { count: 'exact', head: true })
        .gte('recorded_at', start)
        .lte('recorded_at', end);
    if (activeSessionIds.length > 0) ssQuery = ssQuery.in('session_id', activeSessionIds);
    const { count: ssCount } = await ssQuery;
    console.timeEnd("Screenshots count query");
    console.log(`Screenshots count: ${ssCount}`);

    console.log("\n5. Running fetchAllActivitySamples...");
    console.time("fetchAllActivitySamples total time");
    const samples = await fetchAllActivitySamples(
        userSupabase, 
        start, 
        end, 
        'session_id, recorded_at, activity_percent, idle, app_name', 
        {
            organizationId,
            sessionIds: activeSessionIds.length > 0 ? activeSessionIds : undefined
        }
    );
    console.timeEnd("fetchAllActivitySamples total time");
    console.log(`Total samples returned: ${samples?.length}`);
}

runDiagnosis();
