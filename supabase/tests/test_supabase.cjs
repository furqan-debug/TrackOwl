require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function updateBucket() {
    console.log('Updating screenshots bucket to public...');
    const { data, error } = await supabase.storage.updateBucket('screenshots', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
    });

    if (error) {
        console.error('Failed to update bucket:', error);
    } else {
        console.log('Successfully updated bucket visibility to public!');
    }
}

updateBucket();
