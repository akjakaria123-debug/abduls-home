import { getZonedParts, zonedTimeToUtc } from '@/lib/scheduling/slots';

// The calendar reasons in the business's local calendar days ("date keys",
// YYYY-MM-DD), never in UTC days — otherwise a 9pm Sydney post lands on the
// wrong square. Date keys are carried around in a UTC Date purely as a
// calendar-arithmetic vehicle; they are never rendered as instants.

export type CalendarView = 'day' | 'week' | 'month';

export const CALENDAR_VIEWS: CalendarView[] = ['day', 'week', 'month'];

export interface CalendarDay {
  key: string;
  /** False for the padding days a month grid borrows from its neighbours. */
  inPrimaryMonth: boolean;
}

export interface CalendarRange {
  view: CalendarView;
  anchor: string;
  days: CalendarDay[];
  /** UTC bounds for querying: start inclusive, end exclusive. */
  start: Date;
  end: Date;
  label: string;
  previousAnchor: string;
  nextAnchor: string;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function parseDateKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return { year, month, day };
}

export function isValidDateKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const { year, month, day } = parseDateKey(key);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const carrier = new Date(Date.UTC(year, month - 1, day));
  return carrier.getUTCMonth() === month - 1 && carrier.getUTCDate() === day;
}

function keyToCarrier(key: string): Date {
  const { year, month, day } = parseDateKey(key);
  return new Date(Date.UTC(year, month - 1, day));
}

function carrierToKey(carrier: Date): string {
  return formatDateKey(carrier.getUTCFullYear(), carrier.getUTCMonth() + 1, carrier.getUTCDate());
}

export function addDaysToKey(key: string, days: number): string {
  const carrier = keyToCarrier(key);
  carrier.setUTCDate(carrier.getUTCDate() + days);
  return carrierToKey(carrier);
}

function addMonthsToKey(key: string, months: number): string {
  const { year, month, day } = parseDateKey(key);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const daysInTargetMonth = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate();
  // 31 Jan + 1 month has to land on 28/29 Feb, not spill into March.
  target.setUTCDate(Math.min(day, daysInTargetMonth));
  return carrierToKey(target);
}

/** 1 = Monday … 7 = Sunday. */
function isoWeekdayOfKey(key: string): number {
  const weekday = keyToCarrier(key).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((keyToCarrier(toKey).getTime() - keyToCarrier(fromKey).getTime()) / 86_400_000);
}

/** The local calendar day an instant falls on, in the business's timezone. */
export function toDateKey(date: Date, timeZone: string): string {
  const parts = getZonedParts(date, timeZone);
  return formatDateKey(parts.year, parts.month, parts.day);
}

export function todayKey(timeZone: string): string {
  return toDateKey(new Date(), timeZone);
}

function formatKeyLabel(key: string, options: Intl.DateTimeFormatOptions): string {
  // The carrier sits at UTC midnight, so format it in UTC to read back the
  // civil date unchanged.
  return new Intl.DateTimeFormat('en-AU', { ...options, timeZone: 'UTC' }).format(keyToCarrier(key));
}

export function formatDayHeading(key: string): string {
  return formatKeyLabel(key, { weekday: 'short', day: 'numeric' });
}

export function getCalendarRange(
  view: CalendarView,
  anchor: string,
  timeZone: string
): CalendarRange {
  let days: CalendarDay[];
  let label: string;
  let previousAnchor: string;
  let nextAnchor: string;

  if (view === 'day') {
    days = [{ key: anchor, inPrimaryMonth: true }];
    label = formatKeyLabel(anchor, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    previousAnchor = addDaysToKey(anchor, -1);
    nextAnchor = addDaysToKey(anchor, 1);
  } else if (view === 'week') {
    const weekStart = addDaysToKey(anchor, -(isoWeekdayOfKey(anchor) - 1));
    days = Array.from({ length: 7 }, (_, index) => ({
      key: addDaysToKey(weekStart, index),
      inPrimaryMonth: true,
    }));
    label = `${formatKeyLabel(days[0].key, { day: 'numeric', month: 'short' })} – ${formatKeyLabel(
      days[6].key,
      { day: 'numeric', month: 'short', year: 'numeric' }
    )}`;
    previousAnchor = addDaysToKey(weekStart, -7);
    nextAnchor = addDaysToKey(weekStart, 7);
  } else {
    const { year, month } = parseDateKey(anchor);
    const firstOfMonth = formatDateKey(year, month, 1);
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const lastOfMonth = formatDateKey(year, month, daysInMonth);

    // Pad out to whole Monday–Sunday rows so the grid is rectangular.
    const gridStart = addDaysToKey(firstOfMonth, -(isoWeekdayOfKey(firstOfMonth) - 1));
    const gridEnd = addDaysToKey(lastOfMonth, 7 - isoWeekdayOfKey(lastOfMonth));

    days = Array.from({ length: daysBetween(gridStart, gridEnd) + 1 }, (_, index) => {
      const key = addDaysToKey(gridStart, index);
      return { key, inPrimaryMonth: parseDateKey(key).month === month };
    });

    label = formatKeyLabel(firstOfMonth, { month: 'long', year: 'numeric' });
    previousAnchor = addMonthsToKey(firstOfMonth, -1);
    nextAnchor = addMonthsToKey(firstOfMonth, 1);
  }

  const firstDay = parseDateKey(days[0].key);
  const dayAfterLast = parseDateKey(addDaysToKey(days[days.length - 1].key, 1));

  return {
    view,
    anchor,
    days,
    start: zonedTimeToUtc(firstDay.year, firstDay.month, firstDay.day, 0, 0, timeZone),
    end: zonedTimeToUtc(dayAfterLast.year, dayAfterLast.month, dayAfterLast.day, 0, 0, timeZone),
    label,
    previousAnchor,
    nextAnchor,
  };
}
