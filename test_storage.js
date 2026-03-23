
import https from 'https';

const url = "https://lgmggbnaoyoapxqsfgzv.supabase.co";
const anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnbWdnYm5hb3lvYXB4cXNmZ3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NTMxNDIsImV4cCI6MjA4ODEyOTE0Mn0.GkzsADYd-kpJYTgY9EZGwgy5kvN6nyYmfVoLUHRJQI4";

const filename = "plain_test.png";
const storage_url = `${url}/storage/v1/object/screenshots/${filename}`;

const png_data = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==", 'base64');

const options = {
    method: 'PUT',
    headers: {
        'apikey': anon_key,
        'Authorization': `Bearer ${anon_key}`,
        'Content-Type': 'image/png',
        'Content-Length': png_data.length
    }
};

const req = https.request(storage_url, options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => console.log(`Body: ${body}`));
});

req.write(png_data);
req.end();
