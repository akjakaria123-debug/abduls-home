import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { ChatWidget } from '@/components/assistant/chat-widget';
import { signOutAction } from '@/lib/actions/auth';

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, suspended_at')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.suspended_at) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070A1A] px-4">
        <div className="max-w-md rounded-xl border border-white/10 bg-white/[0.04] p-8 text-center backdrop-blur">
          <h1 className="text-lg font-semibold text-white">Account suspended</h1>
          <p className="mt-2 text-sm text-slate-300">
            This account has been suspended and posts are no longer being published. If you think
            this is a mistake, please get in touch with support.
          </p>
          <form action={signOutAction} className="mt-5">
            <button type="submit" className="cursor-pointer text-sm font-medium text-indigo-300 hover:underline">
              Log out
            </button>
          </form>
        </div>
      </div>
    );
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!business) {
    redirect('/onboarding');
  }

  const [{ data: notifications }, { count: unreadCount }] = await Promise.all([
    supabase
      .from('notifications')
      .select('id, message, read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(15),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false),
  ]);

  return (
    <div className="flex min-h-screen bg-[#070A1A] text-slate-100">
      <Sidebar isAdmin={profile?.role === 'admin'} />
      <div className="flex flex-1 flex-col">
        <Topbar
          businessName={business.name}
          userEmail={user.email ?? ''}
          notifications={(notifications ?? []).map((notification) => ({
            id: notification.id,
            message: notification.message,
            read: notification.read,
            createdAt: notification.created_at,
          }))}
          unreadCount={unreadCount ?? 0}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
      <ChatWidget />
    </div>
  );
}
