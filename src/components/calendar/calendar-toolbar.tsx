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
          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <Link
          href={href(view, nextAnchor)}
          aria-label="Next"
          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
        <Link
          href={href(view, todayAnchor)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Today
        </Link>
        <h2 className="ml-1 text-sm font-semibold text-slate-900">{label}</h2>
      </div>

      <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
        {CALENDAR_VIEWS.map((option) => (
          <Link
            key={option}
            href={href(option, anchor)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors',
              option === view ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            )}
          >
            {option}
          </Link>
        ))}
      </div>
    </div>
  );
}
