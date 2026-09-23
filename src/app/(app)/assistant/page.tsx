import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AssistantChat } from '@/components/assistant/assistant-chat';

export default async function AssistantPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Assistant</h1>
        <p className="text-sm text-slate-400">
          Ask for a post, ideas for what to write about, or how any part of this works.
        </p>
      </div>

      {/* Sized against the viewport minus the top bar and the page's own
          padding, so the composer stays put and only the thread scrolls. */}
      <div className="flex h-[calc(100vh-14rem)] flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur">
        <AssistantChat />
      </div>
    </div>
  );
}
