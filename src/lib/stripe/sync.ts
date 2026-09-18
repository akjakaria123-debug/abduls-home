import 'server-only';
import type Stripe from 'stripe';
import type { createAdminClient } from '@/lib/supabase/admin';
import type { SubscriptionStatus } from '@/types/database.types';

type AdminClient = ReturnType<typeof createAdminClient>;

/** Stripe's statuses map 1:1 onto ours, but never trust that blindly. */
const KNOWN_STATUSES = new Set<SubscriptionStatus>([
  'trialing',
  'active',
  'past_due',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'unpaid',
]);

function toSubscriptionStatus(status: string): SubscriptionStatus {
  return KNOWN_STATUSES.has(status as SubscriptionStatus)
    ? (status as SubscriptionStatus)
    : 'incomplete';
}

function toIso(seconds: number | null | undefined): string | null {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

function customerId(subscription: Stripe.Subscription): string | null {
  const { customer } = subscription;
  return typeof customer === 'string' ? customer : customer?.id ?? null;
}

function priceId(subscription: Stripe.Subscription): string | null {
  return subscription.items.data[0]?.price?.id ?? null;
}

/**
 * Finds which business a Stripe subscription belongs to.
 *
 * Checkout stamps the business id into the subscription's metadata, so
 * that is the direct answer. The customer-id lookup is the fallback for
 * subscriptions created outside our checkout (e.g. by hand in the Stripe
 * dashboard).
 */
async function resolveBusinessId(
  admin: AdminClient,
  subscription: Stripe.Subscription
): Promise<string | null> {
  const fromMetadata = subscription.metadata?.business_id;
  if (fromMetadata) return fromMetadata;

  const customer = customerId(subscription);
  if (!customer) return null;

  const { data } = await admin
    .from('subscriptions')
    .select('business_id')
    .eq('stripe_customer_id', customer)
    .maybeSingle();

  return data?.business_id ?? null;
}

export interface SyncResult {
  businessId: string | null;
  status: SubscriptionStatus | null;
}

/**
 * Writes a Stripe subscription's current state onto our row. Idempotent —
 * it sets state rather than mutating it, so Stripe redelivering an event
 * is harmless.
 */
export async function syncSubscription(
  admin: AdminClient,
  subscription: Stripe.Subscription
): Promise<SyncResult> {
  const businessId = await resolveBusinessId(admin, subscription);
  if (!businessId) return { businessId: null, status: null };

  const price = priceId(subscription);
  let planId: string | null = null;

  if (price) {
    const { data: plan } = await admin
      .from('plans')
      .select('id')
      .eq('stripe_price_id', price)
      .maybeSingle();

    planId = plan?.id ?? null;
  }

  const status = toSubscriptionStatus(subscription.status);

  await admin
    .from('subscriptions')
    .update({
      plan_id: planId,
      stripe_customer_id: customerId(subscription),
      stripe_subscription_id: subscription.id,
      status,
      trial_ends_at: toIso(subscription.trial_end),
      current_period_end: toIso(
        (subscription as unknown as { current_period_end?: number }).current_period_end
      ),
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    })
    .eq('business_id', businessId);

  return { businessId, status };
}
