import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Gate for everything under /admin.
 *
 * The role is read with the *user's* client, so RLS proves they are who
 * they say they are; only then is the service-role client handed over for
 * the cross-tenant reads the admin screens need.
 *
 * Non-admins get a 404 rather than a redirect or a 403 — there's no
 * reason to tell someone an admin area exists.
 */
export async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'admin') notFound();

  return { user, profile, admin: createAdminClient() };
}
