const supabaseUrl = 'https://lgmggbnaoyoapxqsfgzv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnbWdnYm5hb3lvYXB4cXNmZ3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NTMxNDIsImV4cCI6MjA4ODEyOTE0Mn0.GkzsADYd-kpJYTgY9EZGwgy5kvN6nyYmfVoLUHRJQI4';

async function test() {
    const res = await fetch(`${supabaseUrl}/rest/v1/project_teams`, {
        method: 'POST',
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify([
            { project_id: '00000000-0000-0000-0000-000000000000', team_id: '00000000-0000-0000-0000-000000000000' }
        ])
    });
    console.log("Status:", res.status);
    console.log("Body:", await res.text());
}

test();
