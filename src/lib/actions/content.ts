'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logApiCall } from '@/lib/api-logs';
import { getAIProvider } from '@/lib/ai';
import { AIProviderError } from '@/lib/ai/provider';
import { buildCategoryMix } from '@/lib/ai/category-mix';
import { loadGenerationContext, loadRecentPosts } from '@/lib/ai/context';
import { buildScheduleSlots } from '@/lib/scheduling/slots';
import { getPostsPerDayLimit } from '@/lib/plans';
import {
  brandProfileSchema,
  contentPreferencesSchema,
  generatePostsSchema,
} from '@/lib/validations/content';
import type { ContentCategory, PostStatus } from '@/types/database.types';

export type ContentActionResult = { error: string } | { success: true; message?: string };

async function getOwnedBusinessId(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();

  return business?.id ?? null;
}

export async function saveContentPreferencesAction(
  _prevState: ContentActionResult | null,
  formData: FormData
): Promise<ContentActionResult> {
  const supabase = createClient();
  const businessId = await getOwnedBusinessId(supabase);
  if (!businessId) return { error: 'Your session expired. Please log in again.' };

  const parsed = contentPreferencesSchema.safeParse({
    enabledCategories: formData.getAll('enabledCategories'),
    postsPerDay: formData.get('postsPerDay'),
    postingDays: formData.getAll('postingDays'),
    postingTimes: formData.getAll('postingTimes'),
    approvalMode: formData.get('approvalMode'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check the form for errors.' };
  }

  const limit = await getPostsPerDayLimit(supabase, businessId);
  if (parsed.data.postsPerDay > limit) {
    return {
      error:
        limit === 0
          ? 'Your trial has ended. Choose a plan in Billing to keep generating content.'
          : `Your plan allows up to ${limit} post${limit === 1 ? '' : 's'} per day. Upgrade for more.`,
    };
  }

  const { error } = await supabase
    .from('content_preferences')
    .update({
      enabled_categories: parsed.data.enabledCategories as ContentCategory[],
      posts_per_day: parsed.data.postsPerDay,
      posting_days: parsed.data.postingDays,
      posting_times: parsed.data.postingTimes,
      approval_mode: parsed.data.approvalMode,
    })
    .eq('business_id', businessId);

  if (error) return { error: 'Could not save your settings. Please try again.' };

  revalidatePath('/settings');
  revalidatePath('/content');
  return { success: true, message: 'Content settings saved.' };
}

export async function saveBrandProfileAction(
  _prevState: ContentActionResult | null,
  formData: FormData
): Promise<ContentActionResult> {
  const supabase = createClient();
  const businessId = await getOwnedBusinessId(supabase);
  if (!businessId) return { error: 'Your session expired. Please log in again.' };

  const parsed = brandProfileSchema.safeParse({
    preferredCta: formData.get('preferredCta'),
    brandVoice: formData.get('brandVoice'),
    wordsToAvoid: formData.get('wordsToAvoid'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check the form for errors.' };
  }

  const wordsToAvoid = (parsed.data.wordsToAvoid ?? '')
    .split(',')
    .map((word) => word.trim())
    .filter(Boolean);

  const { error } = await supabase
    .from('brand_profiles')
    .update({
      preferred_cta: parsed.data.preferredCta || null,
      brand_voice: parsed.data.brandVoice || null,
      words_to_avoid: wordsToAvoid,
    })
    .eq('business_id', businessId);

  if (error) return { error: 'Could not save your brand profile. Please try again.' };

  revalidatePath('/settings');
  return { success: true, message: 'Brand profile saved.' };
}

export async function generatePostsAction(
  _prevState: ContentActionResult | null,
  formData: FormData
): Promise<ContentActionResult> {
  const supabase = createClient();
  const businessId = await getOwnedBusinessId(supabase);
  if (!businessId) return { error: 'Your session expired. Please log in again.' };

  const parsed = generatePostsSchema.safeParse({
    days: formData.get('days'),
    facebookPageId: formData.get('facebookPageId'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check your selection.' };
  }

  const [context, { data: page }] = await Promise.all([
    loadGenerationContext(supabase, businessId),
    supabase
      .from('facebook_pages')
      .select('id, is_selected')
      .eq('id', parsed.data.facebookPageId)
      .eq('business_id', businessId)
      .maybeSingle(),
  ]);

  if (!context?.preferences) {
    return { error: 'Finish setting up your business before generating content.' };
  }

  const { preferences } = context;

  if (!page?.is_selected) {
    return { error: 'Activate a Facebook Page first, on the Facebook Pages screen.' };
  }

  const limit = await getPostsPerDayLimit(supabase, businessId);
  const postsPerDay = Math.min(preferences.postsPerDay, limit);
  if (postsPerDay < 1) {
    return { error: 'Your plan does not include content generation right now. Check Billing.' };
  }

  const slots = buildScheduleSlots({
    timezone: context.timezone,
    postingDays: preferences.postingDays,
    postingTimes: preferences.postingTimes,
    postsPerDay,
    days: parsed.data.days,
  });

  if (!slots.length) {
    return { error: 'No posting times left in that window. Check your posting days and times.' };
  }

  // Never double-book a slot that already holds a post.
  const { data: existing } = await supabase
    .from('posts')
    .select('scheduled_at')
    .eq('business_id', businessId)
    .eq('facebook_page_id', page.id)
    .not('scheduled_at', 'is', null)
    .gte('scheduled_at', slots[0].toISOString())
    .lte('scheduled_at', slots[slots.length - 1].toISOString());

  const taken = new Set((existing ?? []).map((row) => new Date(row.scheduled_at!).getTime()));
  const openSlots = slots.filter((slot) => !taken.has(slot.getTime()));

  if (!openSlots.length) {
    return { error: 'Every slot in that window already has a post scheduled.' };
  }

  // Recent history feeds both the anti-repetition prompt and the mix.
  const recentRows = await loadRecentPosts(supabase, businessId);
  const recentCategories = recentRows
    .map((row) => row.category)
    .reverse() as ContentCategory[];

  const categories = buildCategoryMix(
    preferences.enabledCategories,
    openSlots.length,
    recentCategories
  );

  const provider = getAIProvider();

  let drafts;
  try {
    drafts = await provider.generatePosts({
      business: context.business,
      brand: context.brand,
      categories,
      recentCaptions: recentRows.map((row) => row.caption),
    });

    await logApiCall({
      businessId,
      service: 'openai',
      endpoint: '/chat/completions',
      success: true,
    });
  } catch (error) {
    const message =
      error instanceof AIProviderError
        ? error.message
        : 'Could not reach the AI provider. Please try again.';

    await logApiCall({
      businessId,
      service: 'openai',
      endpoint: '/chat/completions',
      success: false,
      statusCode: error instanceof AIProviderError ? error.status ?? null : null,
      errorMessage: message,
    });

    return { error: message };
  }

  if (!drafts.length) {
    return { error: 'The AI returned no usable posts. Please try again.' };
  }

  // Auto-pilot skips the review step; manual mode parks posts as drafts.
  const status: PostStatus = preferences.approvalMode === 'auto_pilot' ? 'scheduled' : 'draft';

  const rows = drafts.map((draft, index) => ({
    business_id: businessId,
    facebook_page_id: page.id,
    category: draft.category,
    caption: draft.caption,
    cta: draft.cta,
    hashtags: draft.hashtags,
    image_idea: draft.imageIdea,
    image_prompt: draft.imagePrompt,
    status,
    scheduled_at: openSlots[index].toISOString(),
    ai_model: provider.model,
  }));

  const { error: insertError } = await supabase.from('posts').insert(rows);
  if (insertError) {
    return { error: 'Generated the posts but could not save them. Please try again.' };
  }

  // usage has no client write policy — counted via the service role.
  await createAdminClient().rpc('increment_usage', {
    p_business_id: businessId,
    p_generated: rows.length,
  });

  revalidatePath('/content');
  revalidatePath('/dashboard');

  return {
    success: true,
    message:
      status === 'scheduled'
        ? `Generated and scheduled ${rows.length} post${rows.length === 1 ? '' : 's'}.`
        : `Generated ${rows.length} draft${rows.length === 1 ? '' : 's'} for review.`,
  };
}

export async function deletePostAction(postId: string): Promise<ContentActionResult> {
  const supabase = createClient();
  const businessId = await getOwnedBusinessId(supabase);
  if (!businessId) return { error: 'Your session expired. Please log in again.' };

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('business_id', businessId);

  if (error) return { error: 'Could not delete that post.' };

  revalidatePath('/content');
  revalidatePath('/dashboard');
  return { success: true };
}
