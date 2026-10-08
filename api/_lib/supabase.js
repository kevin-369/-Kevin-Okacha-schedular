import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SECRET_KEY } from './config.js';

export function supabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error('Supabase server credentials are not configured.');
  return createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
