import Link from 'next/link';
import { cn } from '@/lib/utils';
import { STATUS_DOTS, formatTime, type CalendarPost } from '@/components/calendar/types';

/** Compact, read-only. Month and week views use these; clicking opens the
 *  day view, where the full editor lives. */
export function PostChip({
  post,
  dateKey,
  timezone,
}: {
  post: CalendarPost;
  dateKey: string;
  timezone: string;
}) {
  return (
    <Link
      href={`/calendar?view=day&date=${dateKey}`}
      className="block rounded-md border border-slate-100 bg-white px-2 py-1 text-left transition-colors hover:border-slate-200 hover:bg-slate-50"
    >
      <span className="flex items-center gap-1.5">
        <span
          className={cn(
            'h-1.5 w-1.5 shrink-0 rounded-full',
            STATUS_DOTS[post.status] ?? 'bg-slate-400'
          )}
        />
        {post.scheduledAt && (
          <span className="shrink-0 text-[11px] font-medium text-slate-500">
            {formatTime(post.scheduledAt, timezone)}
          </span>
        )}
      </span>
      <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-slate-600">
        {post.caption}
      </span>
    </Link>
  );
}
