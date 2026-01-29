const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env vars manually from .env.local
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnv = (key) => {
    const match = envContent.match(new RegExp(`^${key}=(.*)`, 'm'));
    return match ? match[1].trim() : null;
};

const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const key = getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!url || !key) {
    console.error('Missing URL or KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
    console.log('Checking admin_users table...');
    const { data, error } = await supabase.from('admin_users').select('count', { count: 'exact', head: true });

    if (error) {
        console.error('Error accessing admin_users:', error);
    } else {
        console.log('Success! Table exists.');
    }
}

check();
