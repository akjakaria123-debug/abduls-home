import 'server-only';
import { randomUUID } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptToken } from '@/lib/crypto/token-encryption';
import { MetaGraphError, publishToPage } from '@/lib/meta/graph';
import { logApiCall } from '@/lib/api-logs';
import { composePostMessage } from '@/lib/publishing/message';
import { decideRetry, failureMessage, MAX_PUBLISH_ATTEMPTS } from '@/lib/publishing/retry';
import type { Database, PostStatus } from '@/types/database.types';

type AdminClient = ReturnType<typeof createAdminClient>;
type PostRow = Database['public']['Tables']['posts']['Row'];

export interface PublishRunSummary {
  claimed: number;
  published: number;
  retrying: number;
  failed: number;
}

/** Owner lookups are cached per run — many posts share one business. */
async function notifyOwner(
  admin: AdminClient,
  ownerCache: Map<string, string | null>,
  businessId: string,
  type: string,
  message: string
) {
  let ownerId = ownerCache.get(businessId);

  if (ownerId === undefined) {
    const { data } = await admin
      .from('businesses')
      .select('owner_id')
      .eq('id', businessId)
      .maybeSingle();
    ownerId = data?.owner_id ?? null;
    ownerCache.set(businessId, ownerId);
  }

  if (!ownerId) return;

  await admin.from('notifications').insert({ user_id: ownerId, type, message });
}

async function recordAttempt(
  admin: AdminClient,
  postId: string,
  attempt: {
    success: boolean;
    httpStatus?: number | null;
    errorMessage?: string | null;
    facebookPostId?: string | null;
  }
) {
  await admin.from('post_publish_attempts').insert({
    post_id: postId,
    success: attempt.success,
    http_status: attempt.httpStatus ?? null,
    error_message: attempt.errorMessage ?? null,
    facebook_post_id: attempt.facebookPostId ?? null,
  });
}

/** Terminal failure: stop trying, tell the user, count it. */
async function markFailed(
  admin: AdminClient,
  ownerCache: Map<string, string | null>,
  post: PostRow,
  message: string
) {
  await admin
    .from('posts')
    .update({
      status: 'failed' as PostStatus,
      error_message: message,
      retry_count: post.retry_count + 1,
      publish_lock_token: null,
      next_attempt_at: null,
    })
    .eq('id', post.id);

  await admin.rpc('increment_usage', { p_business_id: post.business_id, p_failed: 1 });
  await notifyOwner(
    admin,
    ownerCache,
    post.business_id,
    'publish_failed',
    `A post could not be published: ${message}`
  );
}

async function publishOne(
  admin: AdminClient,
  ownerCache: Map<string, string | null>,
  post: PostRow,
  summary: PublishRunSummary
) {
  if (!post.facebook_page_id) {
    await recordAttempt(admin, post.id, {
      success: false,
      errorMessage: 'No Facebook Page attached to this post.',
    });
    await markFailed(admin, ownerCache, post, 'No Facebook Page is attached to this post.');
    summary.failed += 1;
    return;
  }

  const { data: page } = await admin
    .from('facebook_pages')
    .select('page_id, page_name, page_access_token_encrypted, is_selected, token_status')
    .eq('id', post.facebook_page_id)
    .maybeSingle();

  if (!page) {
    await recordAttempt(admin, post.id, { success: false, errorMessage: 'Page not found.' });
    await markFailed(admin, ownerCache, post, 'That Facebook Page is no longer connected.');
    summary.failed += 1;
    return;
  }

  // Cheap guards before spending a Graph call: a deactivated Page or a
  // token we already know is dead can't publish, and neither improves
  // by being retried.
  if (!page.is_selected) {
    await recordAttempt(admin, post.id, { success: false, errorMessage: 'Page is not active.' });
    await markFailed(
      admin,
      ownerCache,
      post,
      `"${page.page_name}" is no longer an active Page, so this post was not published.`
    );
    summary.failed += 1;
    return;
  }

  if (page.token_status !== 'valid') {
    await recordAttempt(admin, post.id, {
      success: false,
      errorMessage: `Token status is ${page.token_status}.`,
    });
    await markFailed(
      admin,
      ownerCache,
      post,
      `Facebook access for "${page.page_name}" needs reconnecting before posts can publish.`
    );
    summary.failed += 1;
    return;
  }

  const message = composePostMessage({
    caption: post.caption,
    cta: post.cta,
    hashtags: post.hashtags,
  });

  try {
    const result = await publishToPage(
      page.page_id,
      decryptToken(page.page_access_token_encrypted),
      message
    );

    await admin
      .from('posts')
      .update({
        status: 'published' as PostStatus,
        published_at: new Date().toISOString(),
        facebook_post_id: result.id,
        error_message: null,
        publish_lock_token: null,
        next_attempt_at: null,
      })
      .eq('id', post.id);

    await recordAttempt(admin, post.id, { success: true, facebookPostId: result.id });
    await admin.rpc('increment_usage', { p_business_id: post.business_id, p_published: 1 });
    await logApiCall({
      businessId: post.business_id,
      service: 'meta',
      endpoint: '/{page-id}/feed',
      success: true,
    });

    summary.published += 1;
  } catch (error) {
    const isGraphError = error instanceof MetaGraphError;
    const detail = isGraphError ? error.message : 'Could not reach Facebook.';
    const httpStatus = isGraphError ? error.status : null;
    const errorCode = isGraphError ? error.code ?? null : null;

    await recordAttempt(admin, post.id, {
      success: false,
      httpStatus,
      errorMessage: detail,
    });
    await logApiCall({
      businessId: post.business_id,
      service: 'meta',
      endpoint: '/{page-id}/feed',
      success: false,
      statusCode: httpStatus,
      errorMessage: detail,
    });

    const attempts = post.retry_count + 1;
    const decision = decideRetry({ attempts, httpStatus, errorCode });

    // A dead token affects every post on the Page, so flag the Page
    // itself rather than rediscovering it once per post.
    if (decision.needsReauth) {
      await admin
        .from('facebook_pages')
        .update({ token_status: 'needs_reauth' })
        .eq('id', post.facebook_page_id);
    }

    if (decision.action === 'retry') {
      await admin
        .from('posts')
        .update({
          retry_count: attempts,
          error_message: `${detail} Retrying (attempt ${attempts} of ${MAX_PUBLISH_ATTEMPTS}).`,
          publish_lock_token: null,
          next_attempt_at: decision.nextAttemptAt?.toISOString() ?? null,
        })
        .eq('id', post.id);

      summary.retrying += 1;
      return;
    }

    await markFailed(admin, ownerCache, post, failureMessage(decision.kind, detail));
    summary.failed += 1;
  }
}

/**
 * Publishes every post that is due. Safe to run concurrently: posts are
 * claimed with FOR UPDATE SKIP LOCKED, and a post that already carries a
 * facebook_post_id is never claimed again.
 */
export async function publishDuePosts(limit = 25): Promise<PublishRunSummary> {
  const admin = createAdminClient();
  const summary: PublishRunSummary = { claimed: 0, published: 0, retrying: 0, failed: 0 };

  const { data: claimed, error } = await admin.rpc('claim_due_posts', {
    p_lock_token: randomUUID(),
    p_limit: limit,
  });

  if (error) {
    throw new Error(`Could not claim due posts: ${error.message}`);
  }

  const posts = (claimed ?? []) as PostRow[];
  summary.claimed = posts.length;
  const ownerCache = new Map<string, string | null>();

  // Sequential on purpose: Meta rate-limits per Page, and a burst of
  // parallel writes is the fastest way to trip that.
  for (const post of posts) {
    await publishOne(admin, ownerCache, post, summary);
  }

  return summary;
}
