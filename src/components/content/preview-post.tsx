'use client';

import { useState, useTransition } from 'react';
import { Sparkles } from 'lucide-react';
import { previewPostAction } from '@/lib/actions/content';
import type { GeneratedPostDraft } from '@/lib/ai/provider';
import { Button } from '@/components/ui/button';

/**
 * A single throwaway post, written from the business details on file.
 *
 * Shown where a Facebook Page is still missing, so the owner can see the
 * AI working — and judge whether it has understood their business —
 * without waiting on the Meta setup. Nothing here is saved.
 */
export function PreviewPost() {
  const [draft, setDraft] = useState<GeneratedPostDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await previewPostAction();
      if ('error' in result) {
        setDraft(null);
        setError(result.error);
        return;
      }
      setDraft(result.draft);
    });
  }

  return (
    <div className="space-y-4">
      <Button onClick={handleClick} disabled={isPending} variant="outline">
        <Sparkles className="mr-2 h-4 w-4" />
        {isPending ? 'Writing…' : draft ? 'Write another' : 'Preview a sample post'}
      </Button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {draft && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-left">
          <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {draft.category.replace(/_/g, ' ')}
          </span>

          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-800">{draft.caption}</p>

          {draft.cta && <p className="mt-2 text-sm font-medium text-slate-900">{draft.cta}</p>}

          {draft.hashtags.length > 0 && (
            <p className="mt-2 text-sm text-brand-600">
              {draft.hashtags.map((tag) => `#${tag}`).join(' ')}
            </p>
          )}

          {draft.imageIdea && (
            <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
              Image idea: {draft.imageIdea}
            </p>
          )}

          <p className="mt-3 text-xs text-slate-400">
            A sample only — it is not saved and will not be published.
          </p>
        </div>
      )}
    </div>
  );
}
