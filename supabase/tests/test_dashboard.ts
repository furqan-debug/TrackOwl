import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'your-service-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
    console.log("Starting Time Logic Regression Tests...\n");

    // We assume the user has a test organization and user setup
    // Fetch a valid org and user to attach data to
    const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
    const { data: users } = await supabase.from('members').select('id, organization_id').limit(1);

    if (!orgs?.length || !users?.length) {
        console.warn("Skipping DB tests: No test organization or member found. Please seed the DB.");
        return;
    }
    const orgId = orgs[0].id;
    const userId = users[0].id;

    console.log(`Using Org ID: ${orgId}, User ID: ${userId}\n`);

    // --- TEST 1: Minute-Boundary Dedup Edge Case ---
    console.log("TEST 1: Minute-Boundary Dedup Edge Case");
    const { data: s1, error: e1 } = await supabase.from('sessions').insert({
        user_id: userId,
        organization_id: orgId,
        started_at: '2026-07-30T10:00:00Z',
        ended_at: '2026-07-30T10:10:00Z'
    }).select('id').single();
    if (e1) throw new Error("Failed to create test session: " + JSON.stringify(e1));

    // Insert two samples in the same minute
    await supabase.from('activity_samples').insert([
        { session_id: s1.id, organization_id: orgId, activity_percent: 100, recorded_at: '2026-07-30T10:05:01Z' },
        { session_id: s1.id, organization_id: orgId, activity_percent: 100, recorded_at: '2026-07-30T10:05:59Z' }
    ]);

    // Query RPC
    const { data: res1 } = await supabase.rpc('get_dashboard_metrics', {
        p_org_id: orgId,
        p_start_iso: '2026-07-30T00:00:00Z',
        p_end_iso: '2026-07-30T23:59:59Z',
        p_prev_start_iso: '2026-07-29T00:00:00Z',
        p_prev_end_iso: '2026-07-29T23:59:59Z',
        p_member_ids: [userId]
    });

    if (res1.total_mins !== 1) {
        console.error(`❌ TEST 1 FAILED: Expected 1 deduped minute, got ${res1.total_mins}`);
    } else {
        console.log("✅ TEST 1 PASSED: Minute boundary successfully deduplicated.");
    }

    // --- TEST 2: Manual Time Rounding ---
    console.log("\nTEST 2: Manual Time Rounding (Floor arithmetic)");
    const { data: s2, error: e2 } = await supabase.from('sessions').insert({
        user_id: userId,
        organization_id: orgId,
        started_at: '2026-07-30T09:03:22Z',
        ended_at: '2026-07-30T09:47:51Z', // 44 minutes 29 seconds
        manual: true
    }).select('id').single();
    if (e2) throw new Error("Failed to create manual session: " + JSON.stringify(e2));

    const { data: res2 } = await supabase.rpc('get_dashboard_metrics', {
        p_org_id: orgId,
        p_start_iso: '2026-07-30T00:00:00Z',
        p_end_iso: '2026-07-30T23:59:59Z',
        p_prev_start_iso: '2026-07-29T00:00:00Z',
        p_prev_end_iso: '2026-07-29T23:59:59Z',
        p_member_ids: [userId]
    });

    // We expect +44 from Test 2, and +1 from Test 1, total 45.
    if (res2.total_mins !== 45) {
        console.error(`❌ TEST 2 FAILED: Expected 45 total minutes, got ${res2.total_mins}`);
    } else {
        console.log("✅ TEST 2 PASSED: Manual time successfully floor-rounded to 44 minutes.");
    }

    // --- TEST 3: Chain-Expansion & Bound Rejection ---
    console.log("\nTEST 3: Chain-Expansion Loophole & Bound Rejection");
    // Create a closed session with original_ended_at set
    const { data: s3, error: e3 } = await supabase.from('sessions').insert({
        user_id: userId,
        organization_id: orgId,
        started_at: '2026-07-01T10:00:00Z',
        ended_at: '2026-07-01T10:00:00Z',
        original_ended_at: '2026-07-01T10:00:00Z'
    }).select('id').single();
    if (e3) throw new Error("Failed to create chain-expansion session: " + JSON.stringify(e3));

    // Insert an 8-hour late sample (should expand because 8h < 7 days)
    await supabase.from('activity_samples').insert({
        session_id: s3.id,
        organization_id: orgId,
        activity_percent: 100,
        recorded_at: '2026-07-01T18:00:00Z' // 8 hours later
    });

    // Check if it expanded
    const { data: verify3a } = await supabase.from('sessions').select('ended_at').eq('id', s3.id).single();
    if (verify3a?.ended_at !== '2026-07-01T18:00:00+00:00') {
        console.error(`❌ TEST 3a FAILED: Session did not expand to 18:00 (within bound). Got: ${verify3a?.ended_at}`);
    } else {
        console.log("✅ TEST 3a PASSED: Session expanded correctly within 7-day bound.");
    }

    // Insert a sample 8 days later (outside bound)
    await supabase.from('activity_samples').insert({
        session_id: s3.id,
        organization_id: orgId,
        activity_percent: 100,
        recorded_at: '2026-07-09T18:00:00Z' // 8 days after original_ended_at
    });

    // Check if it ignored expansion
    const { data: verify3b } = await supabase.from('sessions').select('ended_at').eq('id', s3.id).single();
    if (verify3b?.ended_at !== '2026-07-01T18:00:00+00:00') {
        console.error(`❌ TEST 3b FAILED: Session wrongly expanded past the 7-day bound. Got: ${verify3b?.ended_at}`);
    } else {
        console.log("✅ TEST 3b PASSED: Out-of-bounds sample successfully rejected.");
    }

    // Check audit table for visibility
    const { data: audits } = await supabase.from('session_corrections').select('status').eq('session_id', s3.id);
    const hasApplied = audits?.some(a => a.status === 'Applied');
    const hasRejected = audits?.some(a => a.status === 'Rejected_OutOfBounds');
    
    if (hasApplied && hasRejected) {
        console.log("✅ TEST 3c PASSED: Audit trail correctly logged Applied and Rejected_OutOfBounds statuses.");
    } else {
        console.error(`❌ TEST 3c FAILED: Audit trail missing expected statuses. Got: ${JSON.stringify(audits)}`);
    }

    console.log("\nAll Time Logic regression tests completed.");
}

runTests().catch(console.error);
