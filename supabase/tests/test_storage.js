
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
