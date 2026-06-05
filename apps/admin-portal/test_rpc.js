import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lgmggbnaoyoapxqsfgzv.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '...'; // I will get it from .env

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve('c:/dev/DigiReps Tracker/apps/admin-portal/.env') });

const supabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.rpc('admin_update_ticket_status', {
    secret: 'supersecret123',
    p_ticket_id: 'a2fd4399-8c9b-4040-bb5e-f76cc0dc2dd5',
    p_status: 'in progress'
  });
  console.log('Error:', error);
}

test();
