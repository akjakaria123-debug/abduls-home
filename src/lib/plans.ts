import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { resolveEntitlements, type Entitlements } from '@/lib/billing/entitlements';

export { TRIAL_MAX_PAGES, TRIAL_MAX_POSTS_PER_DAY } from '@/lib/billing/entitlements';

/** The single place that answers "what is this business allowed to do?". */
export async function getEntitlements(
  supabase: SupabaseClient<Database>,
  businessId: string
): Promise<Entitlements> {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, plan_id, trial_ends_at')
    .eq('business_id', businessId)
    .maybeSingle();

  if (!subscription) {
    return resolveEntitlements({ status: null, planLimits: null, trialEndsAt: null });
  }

  let planLimits = null;
  if (subscription.plan_id) {
    const { data: plan } = await supabase
      .from('plans')
      .select('max_pages, max_posts_per_day')
      .eq('id', subscription.plan_id)
      .maybeSingle();

    if (plan) {
      planLimits = { maxPages: plan.max_pages, maxPostsPerDay: plan.max_posts_per_day };
    }
  }

  return resolveEntitlements({
    status: subscription.status,
    planLimits,
    trialEndsAt: subscription.trial_ends_at,
  });
}

export async function getPageLimit(
  supabase: SupabaseClient<Database>,
  businessId: string
): Promise<number> {
  return (await getEntitlements(supabase, businessId)).maxPages;
}

export async function getPostsPerDayLimit(
  supabase: SupabaseClient<Database>,
  businessId: string
): Promise<number> {
  return (await getEntitlements(supabase, businessId)).maxPostsPerDay;
}
