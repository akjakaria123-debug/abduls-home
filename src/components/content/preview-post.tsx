'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
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
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await previewPostAction();
      if ('error' in result) {
        setDraft(null);
        setImageUrl(null);
        setError(result.error);
        return;
      }
      setDraft(result.draft);
      setImageUrl(result.imageUrl);
    });
  }

  return (
    <div className="space-y-4">
      <Button onClick={handleClick} disabled={isPending} variant="outline">
        <Sparkles className="mr-2 h-4 w-4" />
        {isPending ? 'Writing…' : draft ? 'Write another' : 'Preview a sample post'}
      </Button>

      {error && <p className="text-sm text-red-300">{error}</p>}

      {draft && (
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-left">
          <span className="inline-block rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-slate-300">
            {draft.category.replace(/_/g, ' ')}
          </span>

          {imageUrl && (
            <div className="relative mt-3 aspect-square w-full overflow-hidden rounded-lg bg-white/5">
              <Image
                src={imageUrl}
                alt={draft.imageIdea ?? 'AI-generated sample photo'}
                fill
                sizes="(min-width: 640px) 480px, 90vw"
                className="object-cover"
                unoptimized
              />
            </div>
          )}

          <p className="mt-3 whitespace-pre-wrap text-sm text-white">{draft.caption}</p>

          {draft.cta && <p className="mt-2 text-sm font-medium text-white">{draft.cta}</p>}

          {draft.hashtags.length > 0 && (
            <p className="mt-2 text-sm text-indigo-300">
              {draft.hashtags.map((tag) => `#${tag}`).join(' ')}
            </p>
          )}

          {!imageUrl && draft.imageIdea && (
            <p className="mt-3 border-t border-white/5 pt-3 text-xs text-slate-400">
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
