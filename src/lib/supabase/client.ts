'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database.types';

// Browser-side Supabase client. Uses the public anon key only — safe to
// ship to the client. Row Level Security enforces per-user data access.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
