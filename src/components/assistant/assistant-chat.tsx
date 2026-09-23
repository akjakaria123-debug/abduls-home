'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Send } from 'lucide-react';
import { assistantAction, type AssistantTurn } from '@/lib/actions/assistant';

const SUGGESTIONS = [
  'Write me a post about this week',
  'What should I post about?',
  'How do I change my posting times?',
];

/**
 * The conversation itself, without a frame around it.
 *
 * Shared by the floating widget and the full Assistant page so there is
 * one implementation of the thread, the sanitising contract with the
 * server, and the failure behaviour — rather than two that drift.
 */
export function AssistantChat({ compact = false }: { compact?: boolean }) {
  const [turns, setTurns] = useState<AssistantTurn[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, isPending]);

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

  return (
    <>
      <div className={`flex-1 space-y-3 overflow-y-auto ${compact ? 'px-4 py-4' : 'px-5 py-6'}`}>
        {turns.length === 0 && (
          <div className={compact ? 'space-y-3' : 'mx-auto max-w-2xl space-y-4'}>
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

        <div className={compact ? '' : 'mx-auto max-w-2xl space-y-3'}>
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
            <p
              className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>

        <div ref={endRef} />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          send(draft);
        }}
        className={`shrink-0 border-t border-white/5 ${compact ? 'px-3 py-3' : 'px-5 py-4'}`}
      >
        <div className={`flex items-center gap-2 ${compact ? '' : 'mx-auto max-w-2xl'}`}>
          <label htmlFor="assistant-input" className="sr-only">
            Message the assistant
          </label>
          <input
            id="assistant-input"
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
        </div>
      </form>
    </>
  );
}
