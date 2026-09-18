import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@/types/database.types';

// Server-side Supabase client for use in Server Components, Server
// Actions, and Route Handlers. Reads/writes the auth session via cookies.
// Still uses the anon key — RLS is what scopes access to the current user.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component during render, where cookies
            // can't be mutated. Session refresh is handled by middleware.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Same as above — safe to ignore in Server Components.
          }
        },
      },
    }
  );
}
