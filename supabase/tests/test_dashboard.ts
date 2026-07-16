import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function main() {
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const { data: sessions } = await supabase.from('sessions').select('*').gte('started_at', fourteenDaysAgo);
    const { data: samples } = await supabase.from('activity_samples').select('*').gte('recorded_at', fourteenDaysAgo);

    console.log(`Found ${sessions?.length} sessions and ${samples?.length} samples in the last 14 days.`);

    const out = {
        sessions: sessions?.slice(0, 5) || [],
        samples: samples?.slice(0, 5) || []
    };
    fs.writeFileSync('schema_debug.json', JSON.stringify(out, null, 2));
}
main();
