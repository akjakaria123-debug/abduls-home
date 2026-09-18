import 'server-only';

export const OAUTH_STATE_COOKIE = 'fb_oauth_state';

// Must exactly match a URI listed under the Meta app's
// Facebook Login → Settings → Valid OAuth Redirect URIs.
export function facebookRedirectUri(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  return `${siteUrl}/api/facebook/callback`;
}
