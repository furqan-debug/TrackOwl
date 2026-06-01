import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lgmggbnaoyoapxqsfgzv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnbWdnYm5hb3lvYXB4cXNmZ3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NTMxNDIsImV4cCI6MjA4ODEyOTE0Mn0.GkzsADYd-kpJYTgY9EZGwgy5kvN6nyYmfVoLUHRJQI4';
const sb = createClient(supabaseUrl, supabaseKey);

const q = sb.from('projects').select('*, project_members!inner(member_id)').eq('project_members.member_id', '123');
console.log("URL is:", (q as any).url.toString());
