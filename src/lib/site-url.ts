// The public origin this deployment is served from, e.g.
// https://postpilot.example. Everything that builds an absolute URL —
// email confirmation links, Stripe return URLs, the Meta OAuth redirect —
// goes through here.
//
// The value is pasted into a hosting dashboard by hand, so it often ends
// up with a trailing slash. That would produce `https://site//api/...`,
// which Meta rejects outright: the redirect URI must match what is
// registered on the app, character for character. Strip it once, here.

export function siteUrl(): string {
  const value = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim().replace(/\/+$/, '');
  return value || 'http://localhost:3000';
}
