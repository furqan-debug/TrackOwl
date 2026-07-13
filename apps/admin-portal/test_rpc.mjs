import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://lgmggbnaoyoapxqsfgzv.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supportSecret = process.env.SUPPORT_ADMIN_SECRET || '';

async function test() {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/admin_update_ticket_status`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      secret: supportSecret,
      p_ticket_id: 'a650dfbd-d771-4f75-a0f6-4737d5953268', // Using the ID from the screenshot
      p_status: 'in progress'
    })
  });
  console.log(res.status, await res.text());
}
test();
