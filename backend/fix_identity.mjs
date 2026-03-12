import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixUserIdentity() {
    const email = 'furqanfreelance1@gmail.com';
    
    // 1. Get actual Auth User ID
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    const actualUser = users.find(u => u.email === email);
    
    if (!actualUser) {
        console.error('Auth user not found for:', email);
        return;
    }
    
    console.log('Actual Auth ID:', actualUser.id);
    
    // 2. Get Member record
    const { data: member, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('email', email)
        .single();
        
    if (memberError) {
        console.log('Member record not found. Creating one...');
        const { error: insertError } = await supabase
            .from('members')
            .insert({
                id: actualUser.id, // Set ID to match Auth UID!
                email: email,
                full_name: 'Furqan',
                role: 'Admin',
                status: 'Active'
            });
        if (insertError) console.error('Insert error:', insertError);
        else console.log('Fixed! Created new member record with matching ID.');
    } else {
        console.log('Existing Member ID:', member.id);
        
        if (member.id !== actualUser.id) {
            console.log('ID mismatch detected. Fixing...');
            
            // We can't easily change the PK if there are FKs.
            // But we can try to update 'auth_user_id' if the column exists.
            // Check if column exists first.
            
            const { error: updateError } = await supabase.rpc('exec_sql', { 
                sql: `UPDATE members SET id = '${actualUser.id}' WHERE email = '${email}';`
            }).catch(() => ({ error: 'RPC failed' }));
            
            if (updateError) {
                console.log('Standard UPDATE failed (likely FK constraints). Trying to link via email-based policy.');
            }
        } else {
            console.log('IDs already match. The issue must be the RLS policy itself.');
        }
    }
}

fixUserIdentity();
