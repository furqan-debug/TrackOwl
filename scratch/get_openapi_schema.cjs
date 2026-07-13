require('dotenv').config();
require('dotenv').config({ path: require('path').resolve(__dirname, '../supabase/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

async function getOpenApi() {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`
        }
    });
    const spec = await res.json();
    const tables = ['sessions', 'screenshots', 'activity_samples', 'members'];
    tables.forEach(t => {
        const def = spec.definitions[t];
        if (def) {
            console.log(`\nTable: ${t}`);
            Object.entries(def.properties || {}).forEach(([col, prop]) => {
                console.log(`  - ${col}: ${prop.type} (format: ${prop.format})`);
            });
        } else {
            console.log(`Table ${t} not found in definitions.`);
        }
    });
}

getOpenApi();
