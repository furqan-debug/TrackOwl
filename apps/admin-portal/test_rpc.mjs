const supabaseUrl = 'https://lgmggbnaoyoapxqsfgzv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnbWdnYm5hb3lvYXB4cXNmZ3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NTMxNDIsImV4cCI6MjA4ODEyOTE0Mn0.GkzsADYd-kpJYTgY9EZGwgy5kvN6nyYmfVoLUHRJQI4';

async function test() {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/admin_update_ticket_status`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      secret: 'supersecret123',
      p_ticket_id: 'a650dfbd-d771-4f75-a0f6-4737d5953268', // Using the ID from the screenshot
      p_status: 'in progress'
    })
  });
  console.log(res.status, await res.text());
}
test();
