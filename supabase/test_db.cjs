require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkColumns() {
    try {
        console.log("Checking activity_samples table columns...");
        const { data, error } = await supabase
            .from('activity_samples')
            .select('*')
            .limit(1);

        if (error) {
            console.error("Error querying activity_samples:", error);
        } else {
            console.log("Activity samples first row sample:", data);
        }
    } catch (err) {
        console.error("Crash checking table:", err);
    }
}

checkColumns();
