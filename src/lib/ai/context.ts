import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApprovalMode, ContentCategory, Database } from '@/types/database.types';
import type { BrandContext, BusinessContext } from '@/lib/ai/provider';

// Everything the AI needs to know about a business, loaded once and shared
// by bulk generation and single-post regeneration.

export interface ContentPreferences {
  enabledCategories: ContentCategory[];
  postsPerDay: number;
  postingDays: number[];
  postingTimes: string[];
  approvalMode: ApprovalMode;
}

export interface GenerationContext {
  business: BusinessContext;
  brand: BrandContext;
  timezone: string;
  preferences: ContentPreferences | null;
}

export async function loadGenerationContext(
  supabase: SupabaseClient<Database>,
  businessId: string
): Promise<GenerationContext | null> {
  const [{ data: business }, { data: preferences }, { data: brand }] = await Promise.all([
    supabase
      .from('businesses')
      .select(
        'name, category, description, location, website, target_customers, products_services, main_offers, brand_tone, preferred_language, timezone'
      )
      .eq('id', businessId)
      .maybeSingle(),
    supabase
      .from('content_preferences')
      .select('enabled_categories, posts_per_day, posting_days, posting_times, approval_mode')
      .eq('business_id', businessId)
      .maybeSingle(),
    supabase
      .from('brand_profiles')
      .select('preferred_cta, brand_voice, words_to_avoid')
      .eq('business_id', businessId)
      .maybeSingle(),
  ]);

  if (!business) return null;

  return {
    business: {
      name: business.name,
      category: business.category,
      description: business.description,
      location: business.location,
      website: business.website,
      targetCustomers: business.target_customers,
      productsServices: business.products_services,
      mainOffers: business.main_offers,
      brandTone: business.brand_tone,
      language: business.preferred_language,
    },
    brand: {
      preferredCta: brand?.preferred_cta ?? null,
      brandVoice: brand?.brand_voice ?? null,
      wordsToAvoid: brand?.words_to_avoid ?? [],
    },
    timezone: business.timezone,
    preferences: preferences
      ? {
          enabledCategories: preferences.enabled_categories,
          postsPerDay: preferences.posts_per_day,
          postingDays: preferences.posting_days,
          postingTimes: preferences.posting_times,
          approvalMode: preferences.approval_mode,
        }
      : null,
  };
}

/** Recent posts, newest first — feeds the anti-repetition prompt. */
export async function loadRecentPosts(
  supabase: SupabaseClient<Database>,
  businessId: string,
  limit = 15
) {
  const { data } = await supabase
    .from('posts')
    .select('caption, category')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return data ?? [];
}
