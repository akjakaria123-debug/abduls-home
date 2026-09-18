import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Trial users have no plan_id until they pick one at checkout (Phase 6).
// They get the cheapest plan's Page allowance in the meantime.
export const TRIAL_MAX_PAGES = 1;

export async function getPageLimit(
  supabase: SupabaseClient<Database>,
  businessId: string
): Promise<number> {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, plan_id')
    .eq('business_id', businessId)
    .maybeSingle();

  if (subscription?.plan_id) {
    const { data: plan } = await supabase
      .from('plans')
      .select('max_pages')
      .eq('id', subscription.plan_id)
      .maybeSingle();

    if (plan) return plan.max_pages;
  }

  if (subscription?.status === 'trialing') return TRIAL_MAX_PAGES;

  return 0;
}
