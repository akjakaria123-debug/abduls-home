'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { refreshInsightsForBusiness } from '@/lib/analytics/insights';

export type AnalyticsActionResult = { error: string } | { success: true; message: string };

export async function refreshInsightsAction(): Promise<AnalyticsActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Your session expired. Please log in again.' };

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();
  if (!business) return { error: 'No business found.' };

  try {
    const summary = await refreshInsightsForBusiness(business.id);
    revalidatePath('/analytics');

    if (summary.refreshed === 0) {
      return {
        success: true,
        message:
          summary.considered === 0
            ? 'No published posts to check yet.'
            : 'Everything is already up to date.',
      };
    }

    return {
      success: true,
      message: `Updated ${summary.refreshed} post${summary.refreshed === 1 ? '' : 's'}.`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Could not refresh analytics.',
    };
  }
}
