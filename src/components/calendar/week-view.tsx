import Link from 'next/link';
import type { CalendarDay } from '@/lib/scheduling/calendar';
import { formatDayHeading } from '@/lib/scheduling/calendar';
import { PostChip } from '@/components/calendar/post-chip';
import type { CalendarPost } from '@/components/calendar/types';
import { cn } from '@/lib/utils';

export function WeekView({
  days,
  postsByDay,
  timezone,
  todayAnchor,
}: {
  days: CalendarDay[];
  postsByDay: Map<string, CalendarPost[]>;
  timezone: string;
  todayAnchor: string;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
      {days.map((day) => {
        const posts = postsByDay.get(day.key) ?? [];
        const isToday = day.key === todayAnchor;

        return (
          <div
            key={day.key}
            className={cn(
              'rounded-xl border bg-white p-2',
              isToday ? 'border-brand-300' : 'border-slate-200'
            )}
          >
            <Link
              href={`/calendar?view=day&date=${day.key}`}
              className={cn(
                'mb-2 block text-xs font-medium hover:underline',
                isToday ? 'text-brand-700' : 'text-slate-500'
              )}
            >
              {formatDayHeading(day.key)}
            </Link>

            <div className="space-y-1">
              {posts.length ? (
                posts.map((post) => (
                  <PostChip key={post.id} post={post} dateKey={day.key} timezone={timezone} />
                ))
              ) : (
                <p className="px-1 py-2 text-[11px] text-slate-400">No posts</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
