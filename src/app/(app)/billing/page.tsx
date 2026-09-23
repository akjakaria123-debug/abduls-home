import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getEntitlements } from '@/lib/plans';
import { entitlementMessage } from '@/lib/billing/entitlements';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PlanCard } from '@/components/billing/plan-card';
import { ManageBillingButton } from '@/components/billing/manage-billing-button';
import type { Json } from '@/types/database.types';

const STATUS_LABELS: Record<string, string> = {
  trialing: 'Free trial',
  active: 'Active',
  past_due: 'Payment failed',
  canceled: 'Cancelled',
  unpaid: 'Unpaid',
  incomplete: 'Incomplete',
  incomplete_expired: 'Expired',
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('en-AU', { dateStyle: 'medium' }) : '—';
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { checkout?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();
  if (!business) redirect('/onboarding');

  const periodStart = new Date();
  periodStart.setDate(1);

  const [{ data: subscription }, { data: plans }, { data: usage }, entitlements] = await Promise.all([
    supabase
      .from('subscriptions')
      .select(
        'status, plan_id, trial_ends_at, current_period_end, cancel_at_period_end, stripe_customer_id'
      )
      .eq('business_id', business.id)
      .maybeSingle(),
    supabase
      .from('plans')
      .select('id, key, name, price_aud, max_pages, max_posts_per_day, features, stripe_price_id')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('usage')
      .select('posts_generated, posts_published, posts_failed')
      .eq('business_id', business.id)
      .eq('period_start', periodStart.toISOString().slice(0, 10))
      .maybeSingle(),
    getEntitlements(supabase, business.id),
  ]);

  const currentPlan = plans?.find((plan) => plan.id === subscription?.plan_id) ?? null;
  const warning = entitlementMessage(entitlements.reason);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Billing</h1>
        <p className="text-sm text-slate-400">Your plan, usage, and payment details.</p>
      </div>

      {searchParams.checkout === 'success' && (
        <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
          Thanks — your subscription is being set up. It may take a few seconds to appear here.
        </p>
      )}
      {searchParams.checkout === 'cancelled' && (
        <p className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
          Checkout cancelled. Nothing has been charged.
        </p>
      )}

      {warning && (
        <p className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800">
          {warning}
        </p>
      )}

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">
              {currentPlan ? currentPlan.name : 'No plan'} ·{' '}
              {subscription ? STATUS_LABELS[subscription.status] ?? subscription.status : 'None'}
            </h2>
            <p className="text-xs text-slate-400">
              {subscription?.status === 'trialing'
                ? `Trial ends ${formatDate(subscription.trial_ends_at)}`
                : subscription?.cancel_at_period_end
                  ? `Cancels on ${formatDate(subscription.current_period_end)}`
                  : subscription?.current_period_end
                    ? `Renews ${formatDate(subscription.current_period_end)}`
                    : 'Not subscribed yet'}
            </p>
          </div>
          {subscription?.stripe_customer_id && <ManageBillingButton />}
        </CardHeader>

        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Pages allowed</p>
            <p className="text-lg font-semibold text-white">{entitlements.maxPages}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Posts/day</p>
            <p className="text-lg font-semibold text-white">{entitlements.maxPostsPerDay}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Generated this month</p>
            <p className="text-lg font-semibold text-white">{usage?.posts_generated ?? 0}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Published this month</p>
            <p className="text-lg font-semibold text-white">{usage?.posts_published ?? 0}</p>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-white">Plans</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {(plans ?? []).map((plan) => (
            <PlanCard
              key={plan.key}
              planKey={plan.key}
              name={plan.name}
              priceAud={plan.price_aud}
              maxPages={plan.max_pages}
              maxPostsPerDay={plan.max_posts_per_day}
              features={Array.isArray(plan.features) ? (plan.features as Json[]).map(String) : []}
              isCurrent={plan.id === subscription?.plan_id}
              isConfigured={Boolean(plan.stripe_price_id)}
            />
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Upgrades, downgrades and cancellations are handled through Stripe&apos;s billing portal.
        </p>
      </div>
    </div>
  );
}
