import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function linkUser() {
    const email = 'furqanfreelance1@gmail.com';
    
    // 1. Get Auth ID
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    const actualUser = users.find(u => u.email === email);
    
    if (!actualUser) {
        console.error('Auth user not found');
        return;
    }
    
    console.log('Linking member to Auth ID:', actualUser.id);
    
    // 2. Update members table
    const { error: updateError } = await supabase
        .from('members')
        .update({ auth_user_id: actualUser.id })
        .eq('email', email);
        
    if (updateError) {
        console.error('Update error (maybe column missing?):', updateError);
        // If column is missing, we should use the email-based RLS instead
    } else {
        console.log('Successfully linked! Now trying to update RLS to use auth_user_id...');
    }
}

linkUser();
