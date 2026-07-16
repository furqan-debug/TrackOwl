const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read env
const envFile = fs.readFileSync(path.join(__dirname, 'backend/.env'), 'utf8');
let SUPABASE_URL = '';
let SUPABASE_SERVICE_KEY = '';

envFile.split('\n').forEach(line => {
    if (line.startsWith('SUPABASE_URL=')) SUPABASE_URL = line.split('=')[1].trim();
    if (line.startsWith('SUPABASE_SERVICE_KEY=')) SUPABASE_SERVICE_KEY = line.split('=')[1].trim();
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkRecentData() {
    const tenMinsAgo = new Date(Date.now() - 15 * 60000).toISOString();

    console.log('Fetching activity samples since', tenMinsAgo);
    const { data: samples, error: sErr } = await supabase
        .from('activity_samples')
        .select('*')
        .gte('recorded_at', tenMinsAgo)
        .order('recorded_at', { ascending: false });

    if (sErr) console.error(sErr);
    else console.log(`Found ${samples.length} activity samples.`);
    if (samples?.length > 0) console.log('Latest Sample:', samples[0]);

    console.log('\nFetching screenshots since', tenMinsAgo);
    const { data: screens, error: scErr } = await supabase
        .from('screenshots')
        .select('*')
        .gte('recorded_at', tenMinsAgo)
        .order('recorded_at', { ascending: false });

    if (scErr) console.error(scErr);
    else console.log(`Found ${screens.length} screenshots.`);
    if (screens?.length > 0) console.log('Latest Screenshot:', screens[0]);

    console.log('\nFetching sessions since', tenMinsAgo);
    const { data: sessions, error: seErr } = await supabase
        .from('sessions')
        .select('*')
        .gte('started_at', tenMinsAgo)
        .order('started_at', { ascending: false });

    if (seErr) console.error(seErr);
    else console.log(`Found ${sessions.length} sessions.`);
    if (sessions?.length > 0) console.log('Latest Session:', sessions[0]);
}

checkRecentData();
