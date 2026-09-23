'use client';

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { deletePostAction } from '@/lib/actions/content';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-white/10 text-slate-300',
  approved: 'bg-blue-500/15 text-blue-200',
  scheduled: 'bg-indigo-500/20 text-indigo-200',
  published: 'bg-emerald-500/100/15 text-emerald-200',
  failed: 'bg-red-500/100/15 text-red-200',
};

export interface PostCardData {
  id: string;
  category: string;
  caption: string;
  cta: string | null;
  hashtags: string[];
  imageIdea: string | null;
  status: string;
  scheduledAt: string | null;
  timezone: string;
}

export function PostCard({ post }: { post: PostCardData }) {
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (deleted) return null;

  function handleDelete() {
    if (!window.confirm('Delete this post?')) return;

    setError(null);
    startTransition(async () => {
      const result = await deletePostAction(post.id);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setDeleted(true);
    });
  }

  const scheduled = post.scheduledAt
    ? new Date(post.scheduledAt).toLocaleString('en-AU', {
        timeZone: post.timezone,
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Not scheduled';

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                STATUS_STYLES[post.status] ?? 'bg-white/10 text-slate-300'
              )}
            >
              {post.status}
            </span>
            <span className="text-xs capitalize text-slate-400">
              {post.category.replace(/_/g, ' ')}
            </span>
            <span className="text-xs text-slate-400">· {scheduled}</span>
          </div>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-red-300 disabled:opacity-50"
            aria-label="Delete post"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <p className="whitespace-pre-wrap text-sm text-white">{post.caption}</p>

        {post.cta && <p className="text-sm font-medium text-white">{post.cta}</p>}

        {post.hashtags.length > 0 && (
          <p className="text-xs text-indigo-300">
            {post.hashtags.map((tag) => `#${tag}`).join(' ')}
          </p>
        )}

        {post.imageIdea && (
          <p className="rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-slate-400">
            Image idea: {post.imageIdea}
          </p>
        )}

        {error && <p className="text-xs text-red-300">{error}</p>}
      </CardContent>
    </Card>
  );
}
