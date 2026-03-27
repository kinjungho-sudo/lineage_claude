import { createClient } from '@supabase/supabase-js';

// Get env vars
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if credentials are valid (simple check)
const isValid = supabaseUrl && supabaseUrl.startsWith('http') && supabaseAnonKey && supabaseAnonKey.length > 10;

export const supabase = isValid
    ? createClient(supabaseUrl, supabaseAnonKey)
    : {
        from: () => ({
            select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'Offline Mode: No DB connection' } }) }) }),
            upsert: () => Promise.resolve({ error: { message: 'Offline Mode: Data not saved' } }),
            update: () => Promise.resolve({ error: { message: 'Offline Mode: Data not saved' } }),
            insert: () => Promise.resolve({ error: { message: 'Offline Mode: Data not saved' } }),
        }),
        channel: () => ({
            on: function () { return this; },
            subscribe: function (cb) {
                if (cb) cb('SUBSCRIBED');
                return this;
            },
            send: () => Promise.resolve(),
            unsubscribe: () => Promise.resolve(),
        }),
        removeChannel: () => Promise.resolve(),
        isOffline: true
    };
