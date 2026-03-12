import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkPolicies() {
    console.log('--- POLICIES ON MEMBERS TABLE ---');
    const { data, error } = await supabase.rpc('exec_sql', {
        sql: `SELECT policyname, roles, cmd, qual FROM pg_policies WHERE tablename = 'members';`
    }).catch(() => {
        // Fallback: try to query if possible or just use a known good method
        return supabase.from('pg_policies').select('*').eq('tablename', 'members');
    });

    if (error) {
        console.log('Could not fetch policies via RPC. Trying direct query (might fail due to permissions)...');
        // Usually, we can't query pg_policies directly via anon/service unless allowed
        // But since this is a common debug need, I'll try to find another way or just report it.
        console.error('Error:', error);
    } else {
        console.log(JSON.stringify(data, null, 2));
    }
}

checkPolicies();
