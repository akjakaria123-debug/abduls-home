// Supabase connection values, read from the environment and cleaned up.
//
// These are pasted by hand into a hosting dashboard, so they routinely
// arrive with a stray newline or — far more damaging — a trailing slash.
// A trailing slash makes every request path start with `//`, which the
// Supabase gateway rejects with "Invalid path specified in request URL":
// the site builds, deploys and renders fine, then fails only at sign-up.
// Normalising here means the whole app is immune to that paste.

function clean(value: string | undefined): string {
  return (value ?? '').trim().replace(/\/+$/, '');
}

export function supabaseUrl(): string {
  return clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function supabaseAnonKey(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
}

export function supabaseServiceRoleKey(): string {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
}
