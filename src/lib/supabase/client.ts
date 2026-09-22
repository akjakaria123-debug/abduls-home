'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database.types';
import { supabaseAnonKey, supabaseUrl } from './env';

// Browser-side Supabase client. Uses the public anon key only — safe to
// ship to the client. Row Level Security enforces per-user data access.
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl(), supabaseAnonKey());
}
