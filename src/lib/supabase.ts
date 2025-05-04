import { createClient } from '@supabase/supabase-js';
import { env, validateEnv } from '../config/env';

// Validate required environment variables
validateEnv();

// Create Supabase client with schema cache disabled to ensure it always uses the latest schema
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
  db: {
    schema: 'public',
  },
  global: {
    headers: { 'x-supabase-cache-control': '0' },
  },
});
