import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense in depth: middleware already guards these routes, but a
  // Server Component should never trust that alone.
  if (!user) {
    redirect('/login');
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!business) {
    redirect('/onboarding');
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar businessName={business.name} userEmail={user.email ?? ''} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
