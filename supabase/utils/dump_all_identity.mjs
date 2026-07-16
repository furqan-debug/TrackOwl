import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function dumpAll() {
    console.log('--- AUTH USERS ---');
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) console.error(authError);
    else users.forEach(u => console.log(`ID: ${u.id} | Email: ${u.email}`));

    console.log('\n--- MEMBERS TABLE ---');
    const { data: members, error: memberError } = await supabase
        .from('members')
        .select('id, email, auth_user_id, role, full_name');
    if (memberError) console.error(memberError);
    else members.forEach(m => console.log(`ID: ${m.id} | Email: ${m.email} | AuthID: ${m.auth_user_id} | Role: ${m.role} | Name: ${m.full_name}`));
}

dumpAll();
