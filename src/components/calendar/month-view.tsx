import Link from 'next/link';
import type { CalendarDay } from '@/lib/scheduling/calendar';
import { PostChip } from '@/components/calendar/post-chip';
import type { CalendarPost } from '@/components/calendar/types';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_CHIPS = 2;

export function MonthView({
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
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
      <div className="grid grid-cols-7 border-b border-white/5 bg-white/[0.04]">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="px-2 py-2 text-center text-xs font-medium text-slate-400">
            {weekday}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const posts = postsByDay.get(day.key) ?? [];
          const isToday = day.key === todayAnchor;

          return (
            <div
              key={day.key}
              className={cn(
                'min-h-[6.5rem] border-b border-r border-white/5 p-1.5 last:border-r-0',
                !day.inPrimaryMonth && 'bg-black/20'
              )}
            >
              <Link
                href={`/calendar?view=day&date=${day.key}`}
                className={cn(
                  'mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs',
                  isToday
                    ? 'bg-indigo-600 font-semibold text-white'
                    : day.inPrimaryMonth
                      ? 'text-slate-300 hover:bg-white/10'
                      : 'text-slate-400 hover:bg-white/10'
                )}
              >
                {Number(day.key.slice(-2))}
              </Link>

              <div className="space-y-1">
                {posts.slice(0, MAX_CHIPS).map((post) => (
                  <PostChip key={post.id} post={post} dateKey={day.key} timezone={timezone} />
                ))}
                {posts.length > MAX_CHIPS && (
                  <Link
                    href={`/calendar?view=day&date=${day.key}`}
                    className="block px-1 text-[11px] font-medium text-indigo-300 hover:underline"
                  >
                    +{posts.length - MAX_CHIPS} more
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
