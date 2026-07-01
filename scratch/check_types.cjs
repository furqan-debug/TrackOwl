const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lgmggbnaoyoapxqsfgzv.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnbWdnYm5hb3lvYXB4cXNmZ3p2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU1MzE0MiwiZXhwIjoyMDg4MTI5MTQyfQ.SAPAT4OpGOAGmj2cTGHiprG--Lapj5bx5GezGF1PUy4';

const supabase = createClient(supabaseUrl, serviceKey);

async function checkTypes() {
    console.log("Checking columns of sessions...");
    const { data: cols, error } = await supabase
        .from('sessions')
        .select('user_id, project_id')
        .limit(1);
    
    if (error) console.error("Error sessions:", error);
    else console.log("Sessions sample:", cols);

    const { data: info, error: errInfo } = await supabase
        .rpc('execute_sql', {
            sql_text: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sessions';"
        });
    if (errInfo) {
        // If execute_sql is not available, we can just print the keys of a record
        console.log("execute_sql not available, doing query instead.");
        const { data: sessionsRecord } = await supabase.from('sessions').select('*').limit(1);
        console.log("sessionsRecord keys/values:", sessionsRecord ? sessionsRecord[0] : null);
        
        const { data: membersRecord } = await supabase.from('members').select('*').limit(1);
        console.log("membersRecord keys/values:", membersRecord ? membersRecord[0] : null);

        const { data: screenshotsRecord } = await supabase.from('screenshots').select('*').limit(1);
        console.log("screenshotsRecord keys/values:", screenshotsRecord ? screenshotsRecord[0] : null);

        const { data: activityRecord } = await supabase.from('activity_samples').select('*').limit(1);
        console.log("activityRecord keys/values:", activityRecord ? activityRecord[0] : null);
    } else {
        console.log("Sessions columns:", info);
    }
}

checkTypes();
