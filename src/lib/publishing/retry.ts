// Deciding whether a failed publish is worth trying again.
//
// The distinction that matters: a rate limit or a wobbly Graph API will
// clear on its own, so retrying is right. A revoked token or a missing
// permission will not, so retrying just burns quota and delays telling
// the user something they have to fix themselves.
//
// Codes are from Meta's Graph API error reference — worth re-checking
// against their docs when upgrading API versions.

export const MAX_PUBLISH_ATTEMPTS = 3;

/** Backoff between attempts. Index = attempts already made. */
const BACKOFF_MINUTES = [5, 15, 45];

/** Broken auth or permissions — needs the user to reconnect Facebook. */
const AUTH_ERROR_CODES = new Set([
  10, // Application does not have permission for this action
  190, // Invalid or expired OAuth access token
  200, // Permissions error
  102, // Session key invalid or no longer valid
  2500, // Cannot call the API with an unauthenticated session
]);

/** Throttling — always worth another go later. */
const RATE_LIMIT_CODES = new Set([
  4, // Application request limit reached
  17, // User request limit reached
  32, // Page request limit reached
  613, // Calls to this API have exceeded the rate limit
]);

/** Meta's own "try again" codes. */
const TRANSIENT_CODES = new Set([
  1, // Unknown/temporary error
  2, // Service temporarily unavailable
]);

export type FailureKind = 'auth' | 'rate_limit' | 'transient' | 'permanent';

export function classifyFailure(params: {
  httpStatus?: number | null;
  errorCode?: number | null;
}): FailureKind {
  const { httpStatus, errorCode } = params;

  if (errorCode != null) {
    if (AUTH_ERROR_CODES.has(errorCode)) return 'auth';
    if (RATE_LIMIT_CODES.has(errorCode)) return 'rate_limit';
    if (TRANSIENT_CODES.has(errorCode)) return 'transient';
  }

  if (httpStatus === 429) return 'rate_limit';
  if (httpStatus != null && httpStatus >= 500) return 'transient';

  // No status at all means the request never completed — a network or
  // DNS problem on our side, which is worth retrying.
  if (httpStatus == null && errorCode == null) return 'transient';

  return 'permanent';
}

export interface RetryDecision {
  action: 'retry' | 'fail';
  nextAttemptAt: Date | null;
  kind: FailureKind;
  /** True when the Page's stored token should be flagged for reconnect. */
  needsReauth: boolean;
}

export function decideRetry(params: {
  /** Attempts made so far, including the one that just failed. */
  attempts: number;
  httpStatus?: number | null;
  errorCode?: number | null;
  now?: Date;
}): RetryDecision {
  const kind = classifyFailure(params);
  const now = params.now ?? new Date();
  const needsReauth = kind === 'auth';

  if (kind === 'auth' || kind === 'permanent') {
    return { action: 'fail', nextAttemptAt: null, kind, needsReauth };
  }

  if (params.attempts >= MAX_PUBLISH_ATTEMPTS) {
    return { action: 'fail', nextAttemptAt: null, kind, needsReauth };
  }

  const minutes = BACKOFF_MINUTES[Math.min(params.attempts - 1, BACKOFF_MINUTES.length - 1)] ?? 45;

  return {
    action: 'retry',
    nextAttemptAt: new Date(now.getTime() + minutes * 60_000),
    kind,
    needsReauth,
  };
}

export function failureMessage(kind: FailureKind, detail: string): string {
  switch (kind) {
    case 'auth':
      return `Facebook rejected the connection: ${detail} Reconnect Facebook to start posting again.`;
    case 'rate_limit':
      return `Facebook is rate limiting this Page: ${detail}`;
    case 'transient':
      return `Facebook could not be reached after ${MAX_PUBLISH_ATTEMPTS} attempts: ${detail}`;
    default:
      return detail;
  }
}
