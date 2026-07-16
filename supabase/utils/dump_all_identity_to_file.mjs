import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function dumpAll() {
    let output = '';
    
    output += '--- AUTH USERS ---\n';
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) output += JSON.stringify(authError) + '\n';
    else users.forEach(u => output += `ID: ${u.id} | Email: ${u.email}\n`);

    output += '\n--- MEMBERS TABLE ---\n';
    const { data: members, error: memberError } = await supabase
        .from('members')
        .select('id, email, auth_user_id, role, full_name');
    if (memberError) output += JSON.stringify(memberError) + '\n';
    else members.forEach(m => output += `ID: ${m.id} | Email: ${m.email} | AuthID: ${m.auth_user_id} | Role: ${m.role} | Name: ${m.full_name}\n`);
    
    fs.writeFileSync('full_identity_dump.txt', output);
    console.log('Dump written to full_identity_dump.txt');
}

dumpAll();
