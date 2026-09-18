// How often to re-ask Meta for a post's numbers.
//
// Engagement is front-loaded: most of a post's reach arrives in the first
// day or two, then barely moves. Polling every post hourly forever would
// burn the Page's rate limit on data that hasn't changed, so freshly
// published posts are checked often and older ones rarely.

/** Posts younger than this are considered still moving. */
export const FRESH_AGE_HOURS = 48;

/** How stale a fresh post's snapshot may get. */
export const FRESH_REFRESH_HOURS = 1;

/** How stale an older post's snapshot may get. */
export const MATURE_REFRESH_HOURS = 24;

/** Past this age a post is left alone — its numbers have settled. */
export const MAX_TRACKED_DAYS = 30;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export function shouldRefreshInsights(params: {
  publishedAt: string | null;
  lastFetchedAt: string | null;
  now?: Date;
}): boolean {
  const { publishedAt, lastFetchedAt } = params;
  if (!publishedAt) return false;

  const now = params.now ?? new Date();
  const age = now.getTime() - new Date(publishedAt).getTime();

  // Not published yet (clock skew, or a bad timestamp) — nothing to read.
  if (age < 0) return false;
  if (age > MAX_TRACKED_DAYS * DAY) return false;

  // Never fetched: always worth one look.
  if (!lastFetchedAt) return true;

  const sinceFetch = now.getTime() - new Date(lastFetchedAt).getTime();
  const allowedStaleness = age <= FRESH_AGE_HOURS * HOUR ? FRESH_REFRESH_HOURS : MATURE_REFRESH_HOURS;

  return sinceFetch >= allowedStaleness * HOUR;
}
