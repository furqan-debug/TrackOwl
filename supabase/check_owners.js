import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('.env') });

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_KEY || '');

async function run() {
  const { data: owners } = await supabase.from('members').select('*').eq('role', 'Owner');
  console.log('Owners count:', owners?.length);
  console.log('Owners:', owners?.map(o => ({ email: o.email, name: o.full_name })));
}
run();
