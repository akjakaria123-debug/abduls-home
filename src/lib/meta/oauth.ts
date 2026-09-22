import 'server-only';
import { siteUrl } from '@/lib/site-url';

export const OAUTH_STATE_COOKIE = 'fb_oauth_state';

// Must exactly match a URI listed under the Meta app's
// Facebook Login → Settings → Valid OAuth Redirect URIs.
export function facebookRedirectUri(): string {
  return `${siteUrl()}/api/facebook/callback`;
}
