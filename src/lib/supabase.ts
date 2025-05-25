import { createClient } from '@supabase/supabase-js';
import { env, validateEnv } from '../config/env';

// Validate required environment variables
validateEnv();

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
  db: {
    schema: 'public',
  },
  global: {
    headers: { 'x-supabase-cache-control': '0' },
  },
});
