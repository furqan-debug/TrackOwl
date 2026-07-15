require('dotenv').config({ path: './supabase/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkColumns() {
    try {
        console.log("Checking screenshots table columns...");
        const { data, error } = await supabase
            .from('screenshots')
            .select('*')
            .limit(1);

        if (error) {
            console.error("Error querying screenshots:", error);
        } else {
            console.log("Screenshots first row sample:", data);
        }
    } catch (err) {
        console.error("Crash checking table:", err);
    }
}

checkColumns();
