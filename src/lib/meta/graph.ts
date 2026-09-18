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

export function buildFacebookOAuthUrl(redirectUri: string, state: string): string {
  const { appId } = getAppCredentials();

  const url = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`);
  url.searchParams.set('client_id', appId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('scope', FACEBOOK_OAUTH_SCOPES.join(','));
  url.searchParams.set('response_type', 'code');

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

export async function fetchUserPages(userAccessToken: string): Promise<FacebookPageSummary[]> {
  const pages: FacebookPageSummary[] = [];

  const first = new URL(`${GRAPH_BASE}/me/accounts`);
  first.searchParams.set('fields', 'id,name,access_token,tasks');
  first.searchParams.set('limit', '100');
  first.searchParams.set('access_token', userAccessToken);

  let next: string | null = first.toString();
  let requests = 0;

  while (next && requests < MAX_PAGE_REQUESTS) {
    const response = await fetch(next, { cache: 'no-store' });
    const body = (await response.json().catch(() => ({}))) as {
      data?: FacebookPageSummary[];
      paging?: { next?: string };
    } & GraphErrorBody;

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
