
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const url = process.env.VITE_SUPABASE_URL || '';
const anon_key = process.env.VITE_SUPABASE_ANON_KEY || '';

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
