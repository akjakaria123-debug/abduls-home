import 'server-only';

// Meta deprecates Graph API versions roughly two years after release —
// check developers.facebook.com/docs/graph-api/changelog and bump
// META_GRAPH_API_VERSION when the pinned one nears end of life.
const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION ?? 'v21.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

// The minimum set needed to list Pages, publish to them, and read the
// engagement metrics the Analytics phase will use.
export const FACEBOOK_OAUTH_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'pages_read_user_content',
] as const;

export class MetaGraphError extends Error {
  readonly status: number;
  readonly code?: number;
  readonly type?: string;
  readonly fbtraceId?: string;

  constructor(
    message: string,
    status: number,
    details?: { code?: number; type?: string; fbtrace_id?: string }
  ) {
    super(message);
    this.name = 'MetaGraphError';
    this.status = status;
    this.code = details?.code;
    this.type = details?.type;
    this.fbtraceId = details?.fbtrace_id;
  }
}

interface GraphErrorBody {
  error?: { message?: string; code?: number; type?: string; fbtrace_id?: string };
}

function getAppCredentials() {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error('META_APP_ID and META_APP_SECRET must be set to use the Meta Graph API.');
  }

  return { appId, appSecret };
}

async function graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${GRAPH_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, { cache: 'no-store' });
  const body = (await response.json().catch(() => ({}))) as T & GraphErrorBody;

  if (!response.ok || body.error) {
    throw new MetaGraphError(
      body.error?.message ?? 'Meta Graph API request failed.',
      response.status,
      body.error
    );
  }

  return body;
}

/**
 * Builds the consent dialog URL.
 *
 * Which parameter carries the permissions depends on the login product
 * the Meta app uses:
 *
 * - Plain "Facebook Login" takes `scope` — the list below.
 * - "Facebook Login for Business" ignores `scope` entirely and takes
 *   `config_id`, pointing at a configuration created on the app that
 *   names the permissions. Send `scope` to it and the user signs in
 *   perfectly happily having granted nothing, and the failure only
 *   appears later as a Graph error about a missing field.
 *
 * So when META_LOGIN_CONFIG_ID is set we send that and nothing else;
 * otherwise we send the scopes.
 */
export function buildFacebookOAuthUrl(redirectUri: string, state: string): string {
  const { appId } = getAppCredentials();
  const configId = process.env.META_LOGIN_CONFIG_ID?.trim();

  const url = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`);
  url.searchParams.set('client_id', appId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('response_type', 'code');

  if (configId) {
    url.searchParams.set('config_id', configId);
  } else {
    url.searchParams.set('scope', FACEBOOK_OAUTH_SCOPES.join(','));
  }

  return url.toString();
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

// The OAuth dialog's `code` buys a short-lived (~1 hour) user token.
export async function exchangeCodeForUserToken(code: string, redirectUri: string) {
  const { appId, appSecret } = getAppCredentials();

  return graphGet<TokenResponse>('/oauth/access_token', {
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });
}

// Which is then swapped for a long-lived (~60 day) user token. Page tokens
// derived from a long-lived user token don't carry their own expiry.
export async function exchangeForLongLivedUserToken(shortLivedToken: string) {
  const { appId, appSecret } = getAppCredentials();

  return graphGet<TokenResponse>('/oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });
}

export async function fetchMetaUserId(userAccessToken: string): Promise<string> {
  const result = await graphGet<{ id: string }>('/me', {
    fields: 'id',
    access_token: userAccessToken,
  });

  return result.id;
}

export interface FacebookPageSummary {
  id: string;
  name: string;
  access_token: string;
  tasks?: string[];
}

const MAX_PAGE_REQUESTS = 10;

interface PageListResponse {
  data?: FacebookPageSummary[];
  paging?: { next?: string };
}

// Walk the /me/accounts edge, following paging, asking for `fields`.
async function listAccounts(
  userAccessToken: string,
  fields: string
): Promise<FacebookPageSummary[]> {
  const pages: FacebookPageSummary[] = [];

  const first = new URL(`${GRAPH_BASE}/me/accounts`);
  first.searchParams.set('fields', fields);
  first.searchParams.set('limit', '100');
  first.searchParams.set('access_token', userAccessToken);

  let next: string | null = first.toString();
  let requests = 0;

  while (next && requests < MAX_PAGE_REQUESTS) {
    const response = await fetch(next, { cache: 'no-store' });
    const body = (await response.json().catch(() => ({}))) as PageListResponse & GraphErrorBody;

    if (!response.ok || body.error) {
      throw new MetaGraphError(
        body.error?.message ?? 'Could not load your Facebook Pages.',
        response.status,
        body.error
      );
    }

    pages.push(...(body.data ?? []));
    next = body.paging?.next ?? null;
    requests += 1;
  }

  return pages;
}

// Some app configurations refuse `access_token` as a field on the
// accounts edge and answer with error 100, "Tried accessing nonexisting
// field (access_token)", even though the Page tokens are there to be had
// one Page at a time. Recognising that shape lets us fall back rather
// than telling the owner their Pages cannot be read.
function isMissingAccessTokenField(error: unknown): boolean {
  return (
    error instanceof MetaGraphError &&
    error.code === 100 &&
    /nonexisting field \(access_token\)/i.test(error.message)
  );
}

export async function fetchUserPages(userAccessToken: string): Promise<FacebookPageSummary[]> {
  try {
    return await listAccounts(userAccessToken, 'id,name,access_token,tasks');
  } catch (error) {
    if (!isMissingAccessTokenField(error)) throw error;
  }

  // Fallback: list the Pages without their tokens, then ask each Page
  // node for its own token. Slower by one request per Page, but it is the
  // documented way to obtain a Page token and it works where the
  // combined call does not.
  const pages = await listAccounts(userAccessToken, 'id,name,tasks');

  const withTokens = await Promise.all(
    pages.map(async (page) => {
      const { access_token } = await graphGet<{ access_token: string }>(`/${page.id}`, {
        fields: 'access_token',
        access_token: userAccessToken,
      });

      return { ...page, access_token };
    })
  );

  return withTokens;
}

export interface TokenDebugInfo {
  is_valid: boolean;
  expires_at?: number;
  scopes?: string[];
}

// Token introspection — the app access token (app_id|app_secret) is what
// Meta requires to inspect another token's validity.
export async function debugToken(inputToken: string): Promise<TokenDebugInfo> {
  const { appId, appSecret } = getAppCredentials();

  const result = await graphGet<{ data: TokenDebugInfo }>('/debug_token', {
    input_token: inputToken,
    access_token: `${appId}|${appSecret}`,
  });

  return result.data;
}

// Permissions without which nothing downstream can work: listing the
// Pages, and publishing to the chosen one.
export const REQUIRED_SCOPES = ['pages_show_list', 'pages_manage_posts'] as const;

export class MissingPermissionsError extends Error {
  readonly missing: string[];
  readonly granted: string[];

  constructor(missing: string[], granted: string[]) {
    super(
      `Facebook did not grant ${missing.join(' and ')}. ` +
        (granted.length
          ? `It granted only: ${granted.join(', ')}.`
          : 'It granted no Page permissions at all.')
    );
    this.name = 'MissingPermissionsError';
    this.missing = missing;
    this.granted = granted;
  }
}

/**
 * Confirms the token actually carries the permissions we asked for.
 *
 * Asking for a scope and receiving it are different things: a consent
 * screen can be dismissed per-permission, and a login product that wants
 * a configuration instead of a `scope` parameter will hand back a valid
 * token that grants nothing. Without this check the first symptom is
 * Meta answering a later call with "(#100) Tried accessing nonexisting
 * field (access_token)", which says nothing about the real cause.
 */
export async function assertPageScopesGranted(userAccessToken: string): Promise<string[]> {
  const info = await debugToken(userAccessToken);
  const granted = info.scopes ?? [];
  const missing = REQUIRED_SCOPES.filter((scope) => !granted.includes(scope));

  if (missing.length > 0) {
    throw new MissingPermissionsError(missing, granted);
  }

  return granted;
}

/**
 * Publishes a text post to a Page's feed.
 *
 * Uses the Page access token, not the user token — publishing as the Page
 * is what `pages_manage_posts` grants. Returns Meta's composite post id
 * ("{page-id}_{post-id}").
 */
export async function publishToPage(
  pageId: string,
  pageAccessToken: string,
  message: string
): Promise<{ id: string }> {
  const body = new URLSearchParams({ message, access_token: pageAccessToken });

  const response = await fetch(`${GRAPH_BASE}/${pageId}/feed`, {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const payload = (await response.json().catch(() => ({}))) as { id?: string } & GraphErrorBody;

  if (!response.ok || payload.error || !payload.id) {
    throw new MetaGraphError(
      payload.error?.message ?? 'Facebook rejected the post.',
      response.status,
      payload.error
    );
  }

  return { id: payload.id };
}

export interface PostInsights {
  reach: number | null;
  clicks: number | null;
  reactions: number | null;
  comments: number | null;
  shares: number | null;
}

/**
 * Reads what Meta will tell us about a published post.
 *
 * Two sources, because they genuinely are two: reach and clicks come from
 * the insights edge, while reactions, comments and shares come from the
 * post object's own summaries.
 *
 * Anything Meta doesn't return comes back as null, never 0 — a metric the
 * API withheld and a metric that is genuinely zero must not look the same
 * to the user. The two halves fail independently so one missing metric
 * doesn't blank out the rest.
 */
export async function fetchPostInsights(
  facebookPostId: string,
  pageAccessToken: string
): Promise<PostInsights> {
  const insights: PostInsights = {
    reach: null,
    clicks: null,
    reactions: null,
    comments: null,
    shares: null,
  };

  try {
    const result = await graphGet<{
      data?: { name: string; values?: { value?: number }[] }[];
    }>(`/${facebookPostId}/insights`, {
      metric: 'post_impressions_unique,post_clicks',
      access_token: pageAccessToken,
    });

    for (const metric of result.data ?? []) {
      const value = metric.values?.[0]?.value;
      if (typeof value !== 'number') continue;
      if (metric.name === 'post_impressions_unique') insights.reach = value;
      if (metric.name === 'post_clicks') insights.clicks = value;
    }
  } catch {
    // Insights can be unavailable for a Page below Meta's reporting
    // threshold. Leave these null and still try the engagement counts.
  }

  try {
    const result = await graphGet<{
      reactions?: { summary?: { total_count?: number } };
      comments?: { summary?: { total_count?: number } };
      shares?: { count?: number };
    }>(`/${facebookPostId}`, {
      fields: 'reactions.summary(true),comments.summary(true),shares',
      access_token: pageAccessToken,
    });

    insights.reactions = result.reactions?.summary?.total_count ?? 0;
    insights.comments = result.comments?.summary?.total_count ?? 0;
    // Meta omits `shares` entirely when a post has none, so a successful
    // response with no shares field really does mean zero.
    insights.shares = result.shares?.count ?? 0;
  } catch {
    // Leave the engagement counts null.
  }

  return insights;
}

// Fully de-authorizes the app for this user — the correct counterpart to
// "Disconnect Facebook", rather than just forgetting the token locally.
export async function revokeUserPermissions(userAccessToken: string): Promise<void> {
  const url = new URL(`${GRAPH_BASE}/me/permissions`);
  url.searchParams.set('access_token', userAccessToken);

  const response = await fetch(url, { method: 'DELETE', cache: 'no-store' });
  const body = (await response.json().catch(() => ({}))) as GraphErrorBody;

  if (!response.ok || body.error) {
    throw new MetaGraphError(
      body.error?.message ?? 'Could not revoke Facebook permissions.',
      response.status,
      body.error
    );
  }
}
