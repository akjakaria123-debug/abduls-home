import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptToken } from '@/lib/crypto/token-encryption';
import { fetchPostInsights } from '@/lib/meta/graph';
import { logApiCall } from '@/lib/api-logs';
import { MAX_TRACKED_DAYS, shouldRefreshInsights } from '@/lib/analytics/refresh-policy';

type AdminClient = ReturnType<typeof createAdminClient>;

export interface RefreshSummary {
  considered: number;
  refreshed: number;
  skipped: number;
  failed: number;
}

interface PublishedPost {
  id: string;
  business_id: string;
  facebook_post_id: string | null;
  facebook_page_id: string | null;
  published_at: string | null;
}

/** Newest snapshot per post, so the policy knows how stale each one is. */
async function loadLatestFetchTimes(
  admin: AdminClient,
  postIds: string[]
): Promise<Map<string, string>> {
  const latest = new Map<string, string>();
  if (!postIds.length) return latest;

  const { data } = await admin
    .from('post_insights')
    .select('post_id, fetched_at')
    .in('post_id', postIds)
    .order('fetched_at', { ascending: false });

  for (const row of data ?? []) {
    if (!latest.has(row.post_id)) latest.set(row.post_id, row.fetched_at);
  }

  return latest;
}

async function refreshPosts(
  admin: AdminClient,
  posts: PublishedPost[],
  limit: number
): Promise<RefreshSummary> {
  const summary: RefreshSummary = {
    considered: posts.length,
    refreshed: 0,
    skipped: 0,
    failed: 0,
  };

  const latestFetch = await loadLatestFetchTimes(
    admin,
    posts.map((post) => post.id)
  );

  const due = posts.filter((post) =>
    shouldRefreshInsights({
      publishedAt: post.published_at,
      lastFetchedAt: latestFetch.get(post.id) ?? null,
    })
  );

  summary.skipped = posts.length - due.length;

  // Page tokens are reused across a business's posts.
  const tokens = new Map<string, string | null>();

  for (const post of due.slice(0, limit)) {
    if (!post.facebook_post_id || !post.facebook_page_id) {
      summary.skipped += 1;
      continue;
    }

    let token = tokens.get(post.facebook_page_id);

    if (token === undefined) {
      const { data: page } = await admin
        .from('facebook_pages')
        .select('page_access_token_encrypted, token_status')
        .eq('id', post.facebook_page_id)
        .maybeSingle();

      token =
        page && page.token_status === 'valid'
          ? decryptToken(page.page_access_token_encrypted)
          : null;
      tokens.set(post.facebook_page_id, token);
    }

    // A Page needing reconnection can't be read either — that's already
    // surfaced on the Facebook Pages screen, so just skip quietly.
    if (!token) {
      summary.skipped += 1;
      continue;
    }

    try {
      const insights = await fetchPostInsights(post.facebook_post_id, token);

      await admin.from('post_insights').insert({
        post_id: post.id,
        reach: insights.reach,
        clicks: insights.clicks,
        reactions: insights.reactions,
        comments: insights.comments,
        shares: insights.shares,
      });

      summary.refreshed += 1;
    } catch (error) {
      summary.failed += 1;
      await logApiCall({
        businessId: post.business_id,
        service: 'meta',
        endpoint: '/{post-id}/insights',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Insights refresh failed.',
      });
    }
  }

  return summary;
}

function trackingCutoff(): string {
  return new Date(Date.now() - MAX_TRACKED_DAYS * 86_400_000).toISOString();
}

/** Cron entry point: refreshes across all businesses. */
export async function refreshDueInsights(limit = 50): Promise<RefreshSummary> {
  const admin = createAdminClient();

  const { data: posts } = await admin
    .from('posts')
    .select('id, business_id, facebook_post_id, facebook_page_id, published_at')
    .eq('status', 'published')
    .not('facebook_post_id', 'is', null)
    .gte('published_at', trackingCutoff())
    .order('published_at', { ascending: false })
    .limit(limit * 4);

  return refreshPosts(admin, posts ?? [], limit);
}

/** On-demand refresh for one business, from the analytics page. */
export async function refreshInsightsForBusiness(
  businessId: string,
  limit = 25
): Promise<RefreshSummary> {
  const admin = createAdminClient();

  const { data: posts } = await admin
    .from('posts')
    .select('id, business_id, facebook_post_id, facebook_page_id, published_at')
    .eq('business_id', businessId)
    .eq('status', 'published')
    .not('facebook_post_id', 'is', null)
    .gte('published_at', trackingCutoff())
    .order('published_at', { ascending: false })
    .limit(limit * 2);

  return refreshPosts(admin, posts ?? [], limit);
}
