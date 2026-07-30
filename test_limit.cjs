const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('apps/admin-portal/.env', 'utf-8');
const urlMatch = envFile.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

if (!urlMatch || !keyMatch) {
  console.log("Could not find credentials");
  process.exit(1);
}

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function run() {
  const { data: member } = await supabase.from('members').select('organization_id, id').limit(1).single();
  if (!member) return console.log("No member");
  
  const { data, count } = await supabase.from('activity_samples')
    .select('id', { count: 'exact' })
    .limit(50000);
    
  console.log("Length:", data?.length, "Count:", count);
}

run();
