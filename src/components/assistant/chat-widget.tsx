'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { assistantAction, type AssistantTurn } from '@/lib/actions/assistant';

const SUGGESTIONS = [
  'Write me a post about this week',
  'What should I post about?',
  'How do I change my posting times?',
];

/**
 * A chat panel pinned to the corner of every dashboard screen.
 *
 * The thread lives in component state and is sent back whole on each
 * turn. Nothing is stored: the assistant answers about the business, and
 * the business is read fresh from the database on the server side every
 * time, so there is nothing here worth persisting — and no migration the
 * owner has to run before it works.
 */
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<AssistantTurn[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, isPending]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Escape closes the panel, as it does for any other overlay.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function send(text: string) {
    const message = text.trim();
    if (!message || isPending) return;

    const next: AssistantTurn[] = [...turns, { role: 'user', content: message }];
    setTurns(next);
    setDraft('');
    setError(null);

    startTransition(async () => {
      const result = await assistantAction(next);

      if ('error' in result) {
        setError(result.error);
        // Put the message back so a failed send is not a lost one.
        setTurns(turns);
        setDraft(message);
        return;
      }

      setTurns([...next, { role: 'assistant', content: result.reply }]);
    });
  }

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
      className="fixed inset-x-3 bottom-3 z-40 flex max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0C1128] shadow-2xl sm:inset-x-auto sm:right-5 sm:bottom-5 sm:h-[34rem] sm:w-[24rem]"
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

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {turns.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">
              Ask me to write a post, suggest what to post about, or explain any part of the app.
            </p>
            <div className="space-y-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => send(suggestion)}
                  className="block w-full cursor-pointer rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-sm text-slate-300 transition-colors hover:border-indigo-400/30 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((turn, i) => (
          <div
            key={i}
            className={turn.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
          >
            <p
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                turn.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'border border-white/10 bg-white/[0.04] text-slate-200'
              }`}
            >
              {turn.content}
            </p>
          </div>
        ))}

        {isPending && (
          <p className="text-sm text-slate-500" role="status">
            Thinking…
          </p>
        )}

        {error && (
          <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">
            {error}
          </p>
        )}

        <div ref={endRef} />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          send(draft);
        }}
        className="flex shrink-0 items-center gap-2 border-t border-white/5 px-3 py-3"
      >
        <label htmlFor="assistant-input" className="sr-only">
          Message the assistant
        </label>
        <input
          id="assistant-input"
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask anything…"
          maxLength={2000}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
        />
        <button
          type="submit"
          disabled={isPending || !draft.trim()}
          aria-label="Send"
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
