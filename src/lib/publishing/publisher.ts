import 'server-only';
import { randomUUID } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptToken } from '@/lib/crypto/token-encryption';
import { MetaGraphError, publishToPage } from '@/lib/meta/graph';
import { logApiCall } from '@/lib/api-logs';
import { ImageUnavailableError, warmImage } from '@/lib/images/pollinations';
import { notifyBusinessOwner } from '@/lib/notifications';
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
  deferred: number;
}

const PUBLISH_TIME_BUDGET_MS = 30_000;

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
  await notifyBusinessOwner(
    admin,
    post.business_id,
    'publish_failed',
    `A post could not be published: ${message}`,
    ownerCache
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
    if (post.image_url) await warmImage(post.image_url);

    const result = await publishToPage(
      page.page_id,
      decryptToken(page.page_access_token_encrypted),
      message,
      post.image_url
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
    const isImageError = error instanceof ImageUnavailableError;
    const detail = isGraphError || isImageError ? error.message : 'Could not reach Facebook.';
    // No status and no code for an image failure: retry.ts treats that as transient.
    const httpStatus = isGraphError ? error.status : null;
    const errorCode = isGraphError ? error.code ?? null : null;

    await recordAttempt(admin, post.id, {
      success: false,
      httpStatus,
      errorMessage: detail,
    });
    await logApiCall({
      businessId: post.business_id,
      service: isImageError ? 'images' : 'meta',
      endpoint: isImageError ? 'image warm-up' : '/{page-id}/feed',
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
  const summary: PublishRunSummary = {
    claimed: 0,
    published: 0,
    retrying: 0,
    failed: 0,
    deferred: 0,
  };

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
  const startedAt = Date.now();

  // Sequential on purpose: Meta rate-limits per Page, and a burst of
  // parallel writes is the fastest way to trip that.
  for (let i = 0; i < posts.length; i += 1) {
    // An image warm-up can take up to 25s, and the route is killed at 60s.
    // Stop early and hand the rest back so the next run picks them up now
    // rather than after the 10-minute stale-lock window.
    if (Date.now() - startedAt > PUBLISH_TIME_BUDGET_MS) {
      const remaining = posts.slice(i).map((post) => post.id);
      await admin.from('posts').update({ publish_lock_token: null }).in('id', remaining);
      summary.deferred = remaining.length;
      break;
    }
    await publishOne(admin, ownerCache, posts[i], summary);
  }

  return summary;
}
