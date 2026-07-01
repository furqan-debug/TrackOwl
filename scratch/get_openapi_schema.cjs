// Use global fetch

const supabaseUrl = 'https://lgmggbnaoyoapxqsfgzv.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnbWdnYm5hb3lvYXB4cXNmZ3p2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU1MzE0MiwiZXhwIjoyMDg4MTI5MTQyfQ.SAPAT4OpGOAGmj2cTGHiprG--Lapj5bx5GezGF1PUy4';

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
