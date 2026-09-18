'use client';

import { useState, useTransition } from 'react';
import { useFormState } from 'react-dom';
import { CalendarClock, Check, Copy, ExternalLink, Pencil, RefreshCw, Trash2, Undo2 } from 'lucide-react';
import {
  approvePostAction,
  duplicatePostAction,
  regeneratePostAction,
  reschedulePostAction,
  unapprovePostAction,
  updatePostAction,
  type PostActionResult,
} from '@/lib/actions/posts';
import { deletePostAction } from '@/lib/actions/content';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/ui/submit-button';
import { FormMessage } from '@/components/ui/form-message';
import { cn } from '@/lib/utils';
import { STATUS_STYLES, formatTime, type CalendarPost } from '@/components/calendar/types';

const initialState: PostActionResult | null = null;

/** Value for <input type="datetime-local"> in the business's timezone. */
function toLocalInputValue(iso: string | null, timeZone: string): string {
  const date = iso ? new Date(iso) : new Date(Date.now() + 3_600_000);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
  const hour = get('hour') === '24' ? '00' : get('hour');

  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

export function PostEditor({ post, timezone }: { post: CalendarPost; timezone: string }) {
  const [editing, setEditing] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [updateState, updateAction] = useFormState(updatePostAction, initialState);
  const [rescheduleState, rescheduleAction] = useFormState(reschedulePostAction, initialState);

  if (removed) return null;

  const isPublished = post.status === 'published';
  const isScheduled = post.status === 'scheduled';

  function run(action: () => Promise<PostActionResult>, onDone?: () => void) {
    setError(null);
    setFeedback(null);

    startTransition(async () => {
      const result = await action();
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setFeedback(result.message ?? null);
      onDone?.();
    });
  }

  function handleDelete() {
    const warning = isPublished
      ? 'Delete this post from your calendar? It will stay live on Facebook — this only removes your copy of it.'
      : 'Delete this post?';
    if (!window.confirm(warning)) return;

    run(() => deletePostAction(post.id), () => setRemoved(true));
  }

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                STATUS_STYLES[post.status] ?? 'bg-slate-100 text-slate-600'
              )}
            >
              {post.status}
            </span>
            <span className="text-xs capitalize text-slate-500">
              {post.category.replace(/_/g, ' ')}
            </span>
            <span className="text-xs text-slate-400">
              {post.scheduledAt ? formatTime(post.scheduledAt, timezone) : 'No time set'}
            </span>
            {post.pageName && <span className="text-xs text-slate-400">· {post.pageName}</span>}
          </div>

          <div className="flex items-center gap-1">
            {!isPublished && (
              <>
                {isScheduled ? (
                  <button
                    type="button"
                    onClick={() => run(() => unapprovePostAction(post.id))}
                    disabled={isPending}
                    title="Move back to draft"
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50"
                  >
                    <Undo2 className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => run(() => approvePostAction(post.id))}
                    disabled={isPending}
                    title="Approve"
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setEditing((open) => !open);
                    setRescheduling(false);
                  }}
                  title="Edit"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                >
                  <Pencil className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRescheduling((open) => !open);
                    setEditing(false);
                  }}
                  title="Reschedule"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                >
                  <CalendarClock className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => run(() => regeneratePostAction(post.id))}
                  disabled={isPending}
                  title="Rewrite with AI"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-brand-600 disabled:opacity-50"
                >
                  <RefreshCw className={cn('h-4 w-4', isPending && 'animate-spin')} />
                </button>
              </>
            )}

            {isPublished && post.facebookPostId && (
              <a
                href={`https://www.facebook.com/${post.facebookPostId}`}
                target="_blank"
                rel="noopener noreferrer"
                title="View on Facebook"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-brand-600"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}

            <button
              type="button"
              onClick={() => run(() => duplicatePostAction(post.id))}
              disabled={isPending}
              title="Duplicate"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50"
            >
              <Copy className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              title="Delete"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {editing ? (
          <form action={updateAction} className="space-y-3">
            <input type="hidden" name="postId" value={post.id} />
            <div>
              <Label htmlFor={`caption-${post.id}`}>Caption</Label>
              <Textarea
                id={`caption-${post.id}`}
                name="caption"
                rows={5}
                defaultValue={post.caption}
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor={`cta-${post.id}`}>Call to action</Label>
                <Input id={`cta-${post.id}`} name="cta" defaultValue={post.cta ?? ''} />
              </div>
              <div>
                <Label htmlFor={`hashtags-${post.id}`}>Hashtags</Label>
                <Input
                  id={`hashtags-${post.id}`}
                  name="hashtags"
                  defaultValue={post.hashtags.join(', ')}
                />
              </div>
            </div>

            {updateState && 'error' in updateState && <FormMessage error={updateState.error} />}
            {updateState && 'success' in updateState && (
              <FormMessage success={updateState.message} />
            )}

            <div className="flex gap-2">
              <SubmitButton size="sm" pendingText="Saving…">
                Save
              </SubmitButton>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-sm text-slate-500 hover:underline"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <p className="whitespace-pre-wrap text-sm text-slate-800">{post.caption}</p>
            {post.cta && <p className="text-sm font-medium text-slate-900">{post.cta}</p>}
            {post.hashtags.length > 0 && (
              <p className="text-xs text-brand-600">
                {post.hashtags.map((tag) => `#${tag}`).join(' ')}
              </p>
            )}
            {post.imageIdea && (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Image idea: {post.imageIdea}
              </p>
            )}
          </>
        )}

        {rescheduling && (
          <form action={rescheduleAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="postId" value={post.id} />
            <div>
              <Label htmlFor={`when-${post.id}`}>New time ({timezone})</Label>
              <input
                id={`when-${post.id}`}
                type="datetime-local"
                name="scheduledLocal"
                defaultValue={toLocalInputValue(post.scheduledAt, timezone)}
                required
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <SubmitButton size="sm" pendingText="Moving…">
              Reschedule
            </SubmitButton>
            <button
              type="button"
              onClick={() => setRescheduling(false)}
              className="pb-2 text-sm text-slate-500 hover:underline"
            >
              Cancel
            </button>

            {rescheduleState && 'error' in rescheduleState && (
              <div className="w-full">
                <FormMessage error={rescheduleState.error} />
              </div>
            )}
          </form>
        )}

        {post.errorMessage && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {post.errorMessage}
          </p>
        )}

        {error && <FormMessage error={error} />}
        {feedback && <FormMessage success={feedback} />}
      </CardContent>
    </Card>
  );
}
