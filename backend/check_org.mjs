import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
    const { data: members, error: mErr } = await supabase.from('members').select('*');
    console.log('Members:', JSON.stringify(members, null, 2));

    const { data: orgs, error: oErr } = await supabase.from('organizations').select('*');
    console.log('Organizations:', JSON.stringify(orgs, null, 2));
}

check();
