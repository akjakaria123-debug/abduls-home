'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle, Sparkles, X } from 'lucide-react';
import { AssistantChat } from '@/components/assistant/assistant-chat';

/**
 * A chat panel pinned to the corner of every dashboard screen.
 *
 * Hidden on /assistant, where the same conversation already fills the
 * page — a floating button covering the thing it opens is just an
 * obstruction.
 */
export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Escape closes the panel, as it does for any other overlay.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (pathname === '/assistant' || pathname?.startsWith('/assistant/')) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open the assistant"
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white shadow-xl shadow-indigo-900/40 transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
      >
        <MessageCircle className="h-6 w-6" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Assistant"
      className="fixed inset-x-3 bottom-3 z-40 flex max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0C1128] shadow-2xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:h-[34rem] sm:w-[24rem]"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-white/5 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          <Sparkles className="h-4 w-4 text-indigo-300" aria-hidden="true" />
          Assistant
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close the assistant"
          className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>

      <AssistantChat compact />
    </div>
  );
}
