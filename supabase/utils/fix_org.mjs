import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function fix() {
    // 1. Get or Create Organization
    let { data: orgs } = await supabase.from('organizations').select('*');
    let orgId;

    if (!orgs || orgs.length === 0) {
        console.log('Creating default organization...');
        const { data: newOrg, error: orgErr } = await supabase
            .from('organizations')
            .insert([{ name: 'Main Organization' }])
            .select()
            .single();
        
        if (orgErr) {
            console.error('Error creating organization:', orgErr);
            return;
        }
        orgId = newOrg.id;
        console.log('Created Org:', orgId);
    } else {
        orgId = orgs[0].id;
        console.log('Using existing Org:', orgId);
    }

    // 2. Link all members to this org if they don't have one
    const { data: members, error: mErr } = await supabase
        .from('members')
        .update({ organization_id: orgId })
        .is('organization_id', null)
        .select();

    if (mErr) {
        console.error('Error updating members:', mErr);
    } else {
        console.log(`Updated ${members?.length || 0} members to Org: ${orgId}`);
        console.log('Updated members:', members?.map(m => ({ email: m.email, role: m.role })));
    }
}

fix();
