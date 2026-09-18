'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe, siteUrl } from '@/lib/stripe/client';
import { logApiCall } from '@/lib/api-logs';

export type BillingActionResult = { error: string };

async function getOwnedBusiness(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, contact_email')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!business) return null;
  return { ...business, email: user.email ?? business.contact_email ?? undefined };
}

/** Days left on the free trial, so subscribing early doesn't lose them. */
function remainingTrialDays(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  const days = Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000);
  return Math.max(0, Math.min(days, 30));
}

export async function createCheckoutSessionAction(
  _prevState: BillingActionResult | null,
  formData: FormData
): Promise<BillingActionResult> {
  const planKey = String(formData.get('planKey') ?? '');
  if (!planKey) return { error: 'Choose a plan first.' };

  const supabase = createClient();
  const business = await getOwnedBusiness(supabase);
  if (!business) return { error: 'Your session expired. Please log in again.' };

  const { data: plan } = await supabase
    .from('plans')
    .select('id, name, stripe_price_id, is_active')
    .eq('key', planKey)
    .maybeSingle();

  if (!plan?.is_active) return { error: 'That plan is not available.' };
  if (!plan.stripe_price_id) {
    return { error: `${plan.name} is not connected to Stripe yet. Please contact support.` };
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id, trial_ends_at, status')
    .eq('business_id', business.id)
    .maybeSingle();

  // Someone already subscribed should change plans in the portal, where
  // Stripe handles proration — not by buying a second subscription.
  if (subscription?.status === 'active' || subscription?.status === 'past_due') {
    return { error: 'You already have a subscription. Use "Manage billing" to change plans.' };
  }

  let checkoutUrl: string;

  try {
    const stripe = getStripe();
    const trialDays =
      subscription?.status === 'trialing' ? remainingTrialDays(subscription.trial_ends_at) : 0;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      // Reuse the customer if we have one so their history stays together.
      ...(subscription?.stripe_customer_id
        ? { customer: subscription.stripe_customer_id }
        : { customer_email: business.email }),
      client_reference_id: business.id,
      subscription_data: {
        // Carried onto the subscription, so later webhooks know whose it is.
        metadata: { business_id: business.id },
        ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
      },
      success_url: `${siteUrl()}/billing?checkout=success`,
      cancel_url: `${siteUrl()}/billing?checkout=cancelled`,
      allow_promotion_codes: true,
    });

    if (!session.url) return { error: 'Stripe did not return a checkout link.' };
    checkoutUrl = session.url;

    // Record the customer now so the webhook can find this business even
    // if the subscription metadata is somehow missing.
    if (session.customer && !subscription?.stripe_customer_id) {
      const customerId =
        typeof session.customer === 'string' ? session.customer : session.customer.id;
      await createAdminClient()
        .from('subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('business_id', business.id);
    }

    await logApiCall({
      businessId: business.id,
      service: 'stripe',
      endpoint: '/checkout/sessions',
      success: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not start checkout.';
    await logApiCall({
      businessId: business.id,
      service: 'stripe',
      endpoint: '/checkout/sessions',
      success: false,
      errorMessage: message,
    });
    return { error: message };
  }

  redirect(checkoutUrl);
}

export async function createPortalSessionAction(
  _prevState: BillingActionResult | null,
  _formData: FormData
): Promise<BillingActionResult> {
  const supabase = createClient();
  const business = await getOwnedBusiness(supabase);
  if (!business) return { error: 'Your session expired. Please log in again.' };

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('business_id', business.id)
    .maybeSingle();

  if (!subscription?.stripe_customer_id) {
    return { error: 'You do not have a billing account yet. Choose a plan first.' };
  }

  let portalUrl: string;

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${siteUrl()}/billing`,
    });

    portalUrl = session.url;

    await logApiCall({
      businessId: business.id,
      service: 'stripe',
      endpoint: '/billing_portal/sessions',
      success: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not open the billing portal.';
    await logApiCall({
      businessId: business.id,
      service: 'stripe',
      endpoint: '/billing_portal/sessions',
      success: false,
      errorMessage: message,
    });
    return { error: message };
  }

  redirect(portalUrl);
}
