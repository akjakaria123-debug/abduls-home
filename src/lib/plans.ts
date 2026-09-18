import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Trial users have no plan_id until they pick one at checkout (Phase 6).
// They get the cheapest plan's Page allowance in the meantime.
export const TRIAL_MAX_PAGES = 1;
export const TRIAL_MAX_POSTS_PER_DAY = 3;

interface PlanLimits {
  maxPages: number;
  maxPostsPerDay: number;
}

async function getPlanLimits(
  supabase: SupabaseClient<Database>,
  businessId: string
): Promise<PlanLimits> {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, plan_id')
    .eq('business_id', businessId)
    .maybeSingle();

  if (subscription?.plan_id) {
    const { data: plan } = await supabase
      .from('plans')
      .select('max_pages, max_posts_per_day')
      .eq('id', subscription.plan_id)
      .maybeSingle();

    if (plan) {
      return { maxPages: plan.max_pages, maxPostsPerDay: plan.max_posts_per_day };
    }
  }

  if (subscription?.status === 'trialing') {
    return { maxPages: TRIAL_MAX_PAGES, maxPostsPerDay: TRIAL_MAX_POSTS_PER_DAY };
  }

  return { maxPages: 0, maxPostsPerDay: 0 };
}

export async function getPageLimit(
  supabase: SupabaseClient<Database>,
  businessId: string
): Promise<number> {
  return (await getPlanLimits(supabase, businessId)).maxPages;
}

export async function getPostsPerDayLimit(
  supabase: SupabaseClient<Database>,
  businessId: string
): Promise<number> {
  return (await getPlanLimits(supabase, businessId)).maxPostsPerDay;
}
