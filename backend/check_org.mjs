import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkOrg() {
    const { data: members, error } = await supabase
        .from('members')
        .select('email, organization_id')
        .eq('email', 'furqanfreelance1@gmail.com');
    
    if (error) console.error(error);
    else console.log(JSON.stringify(members, null, 2));
}

checkOrg();
