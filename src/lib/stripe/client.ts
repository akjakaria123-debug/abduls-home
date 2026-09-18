import 'server-only';
import Stripe from 'stripe';

let cached: Stripe | null = null;

/**
 * The Stripe client. Server-only — the secret key must never reach the
 * browser. No apiVersion is pinned here, so the SDK uses the version its
 * own types were built against.
 */
export function getStripe(): Stripe {
  if (cached) return cached;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set.');
  }

  cached = new Stripe(key);
  return cached;
}

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}
