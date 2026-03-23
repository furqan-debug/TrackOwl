
import https from 'https';

const url = "https://lgmggbnaoyoapxqsfgzv.supabase.co";
const anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnbWdnYm5hb3lvYXB4cXNmZ3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NTMxNDIsImV4cCI6MjA4ODEyOTE0Mn0.GkzsADYd-kpJYTgY9EZGwgy5kvN6nyYmfVoLUHRJQI4";

const api_url = `${url}/rest/v1/activity_samples`;

// Testing with a dummy session ID and current time
const payload = {
    session_id: "e30ee222-180f-4230-8abe-d3ad99f99806", // A random UUID from logs
    recorded_at: new Date().toISOString(),
    mouse_clicks: 1,
    key_presses: 1,
    app_name: "Test",
    window_title: "Test",
    domain: "test.com",
    idle: false,
    activity_percent: 100
};

const options = {
    method: 'POST',
    headers: {
        'apikey': anon_key,
        'Authorization': `Bearer ${anon_key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
};

const req = https.request(api_url, options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => console.log(`Body: ${body}`));
});

req.write(JSON.stringify(payload));
req.end();
