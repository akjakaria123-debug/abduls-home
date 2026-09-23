import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CALENDAR_VIEWS, type CalendarView } from '@/lib/scheduling/calendar';
import { cn } from '@/lib/utils';

function href(view: CalendarView, date: string) {
  return `/calendar?view=${view}&date=${date}`;
}

export function CalendarToolbar({
  view,
  anchor,
  label,
  previousAnchor,
  nextAnchor,
  todayAnchor,
}: {
  view: CalendarView;
  anchor: string;
  label: string;
  previousAnchor: string;
  nextAnchor: string;
  todayAnchor: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Link
          href={href(view, previousAnchor)}
          aria-label="Previous"
          className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-slate-300 hover:bg-white/5"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <Link
          href={href(view, nextAnchor)}
          aria-label="Next"
          className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-slate-300 hover:bg-white/5"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
        <Link
          href={href(view, todayAnchor)}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
        >
          Today
        </Link>
        <h2 className="ml-1 text-sm font-semibold text-white">{label}</h2>
      </div>

      <div className="flex rounded-lg border border-white/10 bg-white/[0.04] p-0.5">
        {CALENDAR_VIEWS.map((option) => (
          <Link
            key={option}
            href={href(option, anchor)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors',
              option === view ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-white/5'
            )}
          >
            {option}
          </Link>
        ))}
      </div>
    </div>
  );
}
