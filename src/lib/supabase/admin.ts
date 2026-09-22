import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { supabaseServiceRoleKey, supabaseUrl } from './env';

// Service-role Supabase client. Bypasses Row Level Security entirely —
// only ever import this from server-only code (Route Handlers, cron jobs,
// webhooks, the future admin dashboard). The `server-only` import above
// makes any accidental client-side import fail the build.
export function createAdminClient() {
  return createSupabaseClient<Database>(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
