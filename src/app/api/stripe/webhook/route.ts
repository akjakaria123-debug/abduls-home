import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/client';
import { syncSubscription } from '@/lib/stripe/sync';
import { createAdminClient } from '@/lib/supabase/admin';
import { notifyBusinessOwner } from '@/lib/notifications';
import { logApiCall } from '@/lib/api-logs';

export const dynamic = 'force-dynamic';

// Stripe is the source of truth for billing state; this endpoint is how
// that truth reaches us. Everything here is idempotent, because Stripe
// retries deliveries and may send the same event more than once.

async function handleSubscriptionEvent(subscription: Stripe.Subscription) {
  const admin = createAdminClient();
  const { businessId, status } = await syncSubscription(admin, subscription);

  if (!businessId) return;

  if (status === 'canceled' || status === 'unpaid') {
    await notifyBusinessOwner(
      admin,
      businessId,
      'subscription_ended',
      'Your subscription has ended. Posts will stop publishing until you choose a plan.'
    );
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const admin = createAdminClient();
  const customer =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null;

  if (!customer) return;

  const { data: subscription } = await admin
    .from('subscriptions')
    .select('business_id')
    .eq('stripe_customer_id', customer)
    .maybeSingle();

  if (!subscription) return;

  // The matching customer.subscription.updated event moves the status to
  // past_due; this exists so the user actually hears about it.
  await notifyBusinessOwner(
    admin,
    subscription.business_id,
    'payment_failed',
    'Your last payment failed. Update your payment method in Billing to avoid losing access.'
  );
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature.' }, { status: 400 });
  }

  // Signature verification needs the raw body, before any JSON parsing.
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid signature.';
    return NextResponse.json({ error: `Webhook signature failed: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        // The session itself carries little state; fetch the subscription
        // it created and sync from that.
        if (session.subscription) {
          const subscriptionId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription.id;
          const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
          await handleSubscriptionEvent(subscription);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionEvent(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        // Everything else is acknowledged and ignored, so Stripe stops
        // retrying events we have no opinion about.
        break;
    }

    await logApiCall({
      service: 'stripe',
      endpoint: `webhook:${event.type}`,
      success: true,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook handler failed.';

    await logApiCall({
      service: 'stripe',
      endpoint: `webhook:${event.type}`,
      success: false,
      errorMessage: message,
    });

    // A 500 tells Stripe to retry, which is what we want for a transient
    // database problem.
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
