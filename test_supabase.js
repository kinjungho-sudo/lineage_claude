
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual .env parser
const envPath = path.resolve(process.cwd(), '.env');
console.log('Reading .env from:', envPath);

if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing URL or Key in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log('--- Supabase Diagnostics ---');
    console.log('URL:', supabaseUrl);

    try {
        // 1. Check if 'users' table exists by selecting 1 row
        const { data, error } = await supabase.from('users').select('id').limit(1);

        if (error) {
            console.error('❌ Error accessing "users" table:', error.message);
            console.error('Error Code:', error.code);
            console.error('Hint:', error.hint || 'No hint');

            if (error.code === '42P01') {
                console.log('\n[DIAGNOSIS] Table "users" DOES NOT EXIST.');
                console.log('You need to run the SQL query to create the table.');
            }
            else if (error.code === 'PGRST301') {
                console.log('\n[DIAGNOSIS] RLS Policy might be blocking access, or table missing.');
            }
            return;
        }

        console.log('✅ Found "users" table. Access successful.');

        // 1-1. Check columns (nickname, last_active_at)
        const { data: colData, error: colError } = await supabase
            .from('users')
            .select('id, nickname, last_active_at')
            .limit(1);

        if (colError) {
            console.error('❌ Column Check Failed:', colError.message);
            if (colError.message.includes('column') || colError.code === '42703') {
                console.log('\n[DIAGNOSIS] Missing required columns (nickname or last_active_at).');
                console.log('You need to add these columns to the "users" table.');
            }
        } else {
            console.log('✅ Required columns (nickname, last_active_at) exist.');
        }

        // 2. Try Insert Test
        const testId = 'test_' + Date.now();
        const { error: insertError } = await supabase.from('users').insert([{
            id: testId,
            password: 'test',
            game_data: {},
            nickname: 'tester'
        }]);

        if (insertError) {
            console.error('❌ Insert failed:', insertError.message);
        } else {
            console.log('✅ Insert successful. RLS policies likely correct.');
            await supabase.from('users').delete().eq('id', testId);
        }

    } catch (err) {
        console.error('Unexpected execution error:', err);
    }
}

testConnection();
