const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://lgmggbnaoyoapxqsfgzv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnbWdnYm5hb3lvYXB4cXNmZ3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NTMxNDIsImV4cCI6MjA4ODEyOTE0Mn0.GkzsADYd-kpJYTgY9EZGwgy5kvN6nyYmfVoLUHRJQI4';
const sb = createClient(supabaseUrl, supabaseKey);

async function test() {
    // Let's use Furqan's id from the database, or just try an arbitrary uuid
    // First let's get a member id
    const { data: members } = await sb.from('members').select('id, full_name').limit(2);
    if (!members || members.length === 0) return console.log("No members");
    
    const userObj = members[0];
    console.log("Testing for member:", userObj.full_name);
    
    const { data: projs, error } = await sb.from('projects')
        .select('*, project_members!inner(member_id)')
        .eq('project_members.member_id', userObj.id);
        
    if (error) console.error("Error:", error);
    else console.log("Projects assigned:", projs?.length);
    
    const { data: allProjs } = await sb.from('projects').select('*');
    console.log("Total projects:", allProjs?.length);
}

test();
