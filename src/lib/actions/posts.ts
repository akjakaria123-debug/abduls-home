'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { logApiCall } from '@/lib/api-logs';
import { getAIProvider } from '@/lib/ai';
import { AIProviderError } from '@/lib/ai/provider';
import { loadGenerationContext, loadRecentPosts } from '@/lib/ai/context';
import { buildImageUrl, randomSeed } from '@/lib/images/pollinations';
import { zonedTimeToUtc } from '@/lib/scheduling/slots';
import { parseHashtagInput, reschedulePostSchema, updatePostSchema } from '@/lib/validations/posts';
import type { PostStatus } from '@/types/database.types';

export type PostActionResult = { error: string } | { success: true; message?: string };

export type RegenerateImageResult = { error: string } | { success: true; imageUrl: string };

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

/** Loads a post only if it belongs to the caller's business. */
async function loadOwnedPost(
  supabase: ReturnType<typeof createClient>,
  businessId: string,
  postId: string
) {
  const { data } = await supabase
    .from('posts')
    .select(
      'id, category, status, scheduled_at, facebook_page_id, caption, cta, hashtags, image_idea, image_prompt, image_url'
    )
    .eq('id', postId)
    .eq('business_id', businessId)
    .maybeSingle();

  return data;
}

function refreshViews() {
  revalidatePath('/calendar');
  revalidatePath('/content');
  revalidatePath('/dashboard');
}

export async function approvePostAction(postId: string): Promise<PostActionResult> {
  const supabase = createClient();
  const businessId = await getOwnedBusinessId(supabase);
  if (!businessId) return { error: 'Your session expired. Please log in again.' };

  const post = await loadOwnedPost(supabase, businessId, postId);
  if (!post) return { error: 'Post not found.' };
  if (post.status === 'published') return { error: 'That post has already been published.' };

  // A post is only "scheduled" once it has a future slot to publish into.
  // Without one it stays "approved" until the user picks a time.
  const hasFutureSlot = post.scheduled_at && new Date(post.scheduled_at).getTime() > Date.now();
  const status: PostStatus = hasFutureSlot ? 'scheduled' : 'approved';

  const { error } = await supabase
    .from('posts')
    .update({ status, error_message: null })
    .eq('id', postId)
    .eq('business_id', businessId);

  if (error) return { error: 'Could not approve that post.' };

  refreshViews();
  return {
    success: true,
    message: hasFutureSlot ? 'Scheduled.' : 'Approved — now pick a time for it.',
  };
}

export async function unapprovePostAction(postId: string): Promise<PostActionResult> {
  const supabase = createClient();
  const businessId = await getOwnedBusinessId(supabase);
  if (!businessId) return { error: 'Your session expired. Please log in again.' };

  const post = await loadOwnedPost(supabase, businessId, postId);
  if (!post) return { error: 'Post not found.' };
  if (post.status === 'published') return { error: 'That post has already been published.' };

  const { error } = await supabase
    .from('posts')
    .update({ status: 'draft' as PostStatus })
    .eq('id', postId)
    .eq('business_id', businessId);

  if (error) return { error: 'Could not move that post back to draft.' };

  refreshViews();
  return { success: true, message: 'Moved back to draft.' };
}

export async function updatePostAction(
  _prevState: PostActionResult | null,
  formData: FormData
): Promise<PostActionResult> {
  const supabase = createClient();
  const businessId = await getOwnedBusinessId(supabase);
  if (!businessId) return { error: 'Your session expired. Please log in again.' };

  const parsed = updatePostSchema.safeParse({
    postId: formData.get('postId'),
    caption: formData.get('caption'),
    cta: formData.get('cta'),
    hashtags: formData.get('hashtags'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check the post for errors.' };
  }

  const post = await loadOwnedPost(supabase, businessId, parsed.data.postId);
  if (!post) return { error: 'Post not found.' };
  if (post.status === 'published') {
    return { error: 'This post is already live on Facebook and can no longer be edited here.' };
  }

  const { error } = await supabase
    .from('posts')
    .update({
      caption: parsed.data.caption,
      cta: parsed.data.cta || null,
      hashtags: parseHashtagInput(parsed.data.hashtags ?? ''),
    })
    .eq('id', parsed.data.postId)
    .eq('business_id', businessId);

  if (error) return { error: 'Could not save your changes.' };

  refreshViews();
  return { success: true, message: 'Saved.' };
}

export async function reschedulePostAction(
  _prevState: PostActionResult | null,
  formData: FormData
): Promise<PostActionResult> {
  const supabase = createClient();
  const businessId = await getOwnedBusinessId(supabase);
  if (!businessId) return { error: 'Your session expired. Please log in again.' };

  const parsed = reschedulePostSchema.safeParse({
    postId: formData.get('postId'),
    scheduledLocal: formData.get('scheduledLocal'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Pick a valid date and time.' };
  }

  const [post, { data: business }] = await Promise.all([
    loadOwnedPost(supabase, businessId, parsed.data.postId),
    supabase.from('businesses').select('timezone').eq('id', businessId).maybeSingle(),
  ]);

  if (!post || !business) return { error: 'Post not found.' };
  if (post.status === 'published') return { error: 'That post has already been published.' };

  // The picker gives wall-clock time; store the matching UTC instant.
  const [datePart, timePart] = parsed.data.scheduledLocal.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  const scheduledAt = zonedTimeToUtc(year, month, day, hour, minute, business.timezone);

  if (scheduledAt.getTime() <= Date.now()) {
    return { error: 'Pick a time in the future.' };
  }

  if (post.facebook_page_id) {
    const { data: clash } = await supabase
      .from('posts')
      .select('id')
      .eq('business_id', businessId)
      .eq('facebook_page_id', post.facebook_page_id)
      .eq('scheduled_at', scheduledAt.toISOString())
      .neq('id', post.id)
      .maybeSingle();

    if (clash) return { error: 'Another post is already scheduled for that exact time.' };
  }

  // Rescheduling an approved post gives it a slot, so it becomes scheduled.
  const status: PostStatus = post.status === 'approved' ? 'scheduled' : post.status;

  const { error } = await supabase
    .from('posts')
    .update({ scheduled_at: scheduledAt.toISOString(), status })
    .eq('id', post.id)
    .eq('business_id', businessId);

  if (error) return { error: 'Could not reschedule that post.' };

  refreshViews();
  return { success: true, message: 'Rescheduled.' };
}

/**
 * Puts a failed post back in the publish queue. Without this a failed
 * post is a dead end — the user could only delete it.
 */
export async function retryPostAction(postId: string): Promise<PostActionResult> {
  const supabase = createClient();
  const businessId = await getOwnedBusinessId(supabase);
  if (!businessId) return { error: 'Your session expired. Please log in again.' };

  const post = await loadOwnedPost(supabase, businessId, postId);
  if (!post) return { error: 'Post not found.' };
  if (post.status !== 'failed') return { error: 'Only failed posts can be retried.' };

  const isPast = !post.scheduled_at || new Date(post.scheduled_at).getTime() <= Date.now();

  const { error } = await supabase
    .from('posts')
    .update({
      status: 'scheduled' as PostStatus,
      error_message: null,
      retry_count: 0,
      next_attempt_at: null,
      // A post whose slot has passed would otherwise publish instantly;
      // give it a minute so the user can still change their mind.
      scheduled_at: isPast
        ? new Date(Date.now() + 60_000).toISOString()
        : post.scheduled_at,
    })
    .eq('id', post.id)
    .eq('business_id', businessId);

  if (error) return { error: 'Could not queue that post again.' };

  refreshViews();
  return { success: true, message: isPast ? 'Queued to publish shortly.' : 'Back in the queue.' };
}

export async function duplicatePostAction(postId: string): Promise<PostActionResult> {
  const supabase = createClient();
  const businessId = await getOwnedBusinessId(supabase);
  if (!businessId) return { error: 'Your session expired. Please log in again.' };

  const post = await loadOwnedPost(supabase, businessId, postId);
  if (!post) return { error: 'Post not found.' };

  // The copy starts unscheduled — two posts can't share one slot, and
  // guessing a time for the user would be worse than asking.
  const { error } = await supabase.from('posts').insert({
    business_id: businessId,
    facebook_page_id: post.facebook_page_id,
    category: post.category,
    caption: post.caption,
    cta: post.cta,
    hashtags: post.hashtags,
    image_idea: post.image_idea,
    image_prompt: post.image_prompt,
    image_url: post.image_url,
    status: 'draft' as PostStatus,
    scheduled_at: null,
  });

  if (error) return { error: 'Could not duplicate that post.' };

  refreshViews();
  return { success: true, message: 'Duplicated as an unscheduled draft.' };
}

export async function regeneratePostAction(postId: string): Promise<PostActionResult> {
  const supabase = createClient();
  const businessId = await getOwnedBusinessId(supabase);
  if (!businessId) return { error: 'Your session expired. Please log in again.' };

  const post = await loadOwnedPost(supabase, businessId, postId);
  if (!post) return { error: 'Post not found.' };
  if (post.status === 'published') {
    return { error: 'This post is already live on Facebook and can no longer be rewritten here.' };
  }

  const context = await loadGenerationContext(supabase, businessId);
  if (!context) return { error: 'Finish setting up your business first.' };

  const recentRows = await loadRecentPosts(supabase, businessId);

  let drafts;
  let modelUsed = '';
  try {
    // getAIProvider() throws synchronously when the configured vendor's
    // key is missing. Called outside this try, that throw is uncaught
    // and surfaces as Next.js's generic "server-side exception" page
    // instead of the inline message below — see generatePostsAction in
    // content.ts, which had the same bug.
    const provider = getAIProvider();
    modelUsed = provider.model;
    drafts = await provider.generatePosts({
      business: context.business,
      brand: context.brand,
      categories: [post.category],
      // Include this post's own caption so the rewrite differs from it.
      recentCaptions: [post.caption, ...recentRows.map((row) => row.caption)],
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

  const draft = drafts[0];
  if (!draft) return { error: 'The AI returned nothing usable. Please try again.' };

  // New words mean it needs looking at again — unless the user has opted
  // out of reviewing altogether.
  const status: PostStatus =
    context.preferences?.approvalMode === 'auto_pilot' ? post.status : 'draft';

  const { error } = await supabase
    .from('posts')
    .update({
      caption: draft.caption,
      cta: draft.cta,
      hashtags: draft.hashtags,
      image_idea: draft.imageIdea,
      image_prompt: draft.imagePrompt,
      image_url: draft.imagePrompt ? buildImageUrl(draft.imagePrompt, randomSeed()) : null,
      ai_model: modelUsed,
      status,
      error_message: null,
    })
    .eq('id', post.id)
    .eq('business_id', businessId);

  if (error) return { error: 'Rewrote the post but could not save it.' };

  refreshViews();
  return { success: true, message: 'Rewritten.' };
}

/**
 * Re-rolls just the photo, keeping the caption. Cheaper and faster than
 * a full rewrite: no AI call, just a new random seed against the image
 * prompt already on the post.
 */
export async function regenerateImageAction(postId: string): Promise<RegenerateImageResult> {
  const supabase = createClient();
  const businessId = await getOwnedBusinessId(supabase);
  if (!businessId) return { error: 'Your session expired. Please log in again.' };

  const post = await loadOwnedPost(supabase, businessId, postId);
  if (!post) return { error: 'Post not found.' };
  if (post.status === 'published') {
    return { error: 'This post is already live on Facebook and can no longer be changed here.' };
  }
  if (!post.image_prompt) {
    return { error: 'This post has no image idea to generate a photo from.' };
  }

  // The seed is chosen here, so the URL has to come back from here too —
  // the client cannot construct the same one on its own.
  const imageUrl = buildImageUrl(post.image_prompt, randomSeed());

  const { error } = await supabase
    .from('posts')
    .update({ image_url: imageUrl })
    .eq('id', post.id)
    .eq('business_id', businessId);

  if (error) return { error: 'Could not generate a new image.' };

  refreshViews();
  return { success: true, imageUrl };
}
