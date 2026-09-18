// Timezone maths without a date library. A business in Australia/Sydney
// that asks for 9am posts means 9am *there*, across DST changes — so the
// wall-clock time is converted to a UTC instant per day rather than a
// fixed offset being applied once.

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const parts: Record<string, number> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value);
  }

  // Some ICU builds report midnight as hour 24 under hour12: false.
  const hour = parts.hour === 24 ? 0 : parts.hour;

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour,
    minute: parts.minute,
    second: parts.second,
  };
}

function zoneOffsetMs(date: Date, timeZone: string): number {
  const parts = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  // formatToParts has no milliseconds, so compare against whole seconds.
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Converts a wall-clock time in `timeZone` to the matching UTC instant. */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const firstOffset = zoneOffsetMs(new Date(guess), timeZone);
  let instant = guess - firstOffset;

  // Re-check: near a DST boundary the offset at the guessed instant can
  // differ from the offset at the corrected one.
  const secondOffset = zoneOffsetMs(new Date(instant), timeZone);
  if (secondOffset !== firstOffset) instant = guess - secondOffset;

  return new Date(instant);
}

/** ISO weekday for a civil date: 1 = Monday … 7 = Sunday. */
function isoWeekday(year: number, month: number, day: number): number {
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

function parseTime(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;

  return { hour, minute };
}

export interface SlotOptions {
  timezone: string;
  /** 1 = Monday … 7 = Sunday */
  postingDays: number[];
  /** Business-local wall-clock times, "HH:MM" or "HH:MM:SS" */
  postingTimes: string[];
  postsPerDay: number;
  /** How many calendar days ahead to fill */
  days: number;
  /** Slots at or before this instant are skipped. Defaults to now. */
  from?: Date;
}

export function buildScheduleSlots(options: SlotOptions): Date[] {
  const { timezone, postingDays, postingTimes, postsPerDay, days } = options;
  const from = options.from ?? new Date();

  const times = Array.from(new Set(postingTimes))
    .map(parseTime)
    .filter((time): time is { hour: number; minute: number } => time !== null)
    .sort((a, b) => a.hour - b.hour || a.minute - b.minute)
    .slice(0, postsPerDay);

  if (!times.length || !postingDays.length || days <= 0) return [];

  const today = getZonedParts(from, timezone);
  const slots: Date[] = [];

  for (let offset = 0; offset < days; offset += 1) {
    // Carry the civil date in a UTC Date purely for calendar arithmetic.
    const cursor = new Date(Date.UTC(today.year, today.month - 1, today.day));
    cursor.setUTCDate(cursor.getUTCDate() + offset);

    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth() + 1;
    const day = cursor.getUTCDate();

    if (!postingDays.includes(isoWeekday(year, month, day))) continue;

    for (const time of times) {
      const instant = zonedTimeToUtc(year, month, day, time.hour, time.minute, timezone);
      if (instant.getTime() > from.getTime()) slots.push(instant);
    }
  }

  return slots.sort((a, b) => a.getTime() - b.getTime());
}
