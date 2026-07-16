import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkVerification() {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.email === 'furqanfreelance1@gmail.com');
    
    if (user) {
        if (user.email_confirmed_at) {
            console.log('---VERIFIED---');
            console.log('Confirmed at:', user.email_confirmed_at);
        } else {
            console.log('---NOT_VERIFIED---');
        }
    } else {
        console.log('---USER_NOT_FOUND---');
    }
}

checkVerification();
