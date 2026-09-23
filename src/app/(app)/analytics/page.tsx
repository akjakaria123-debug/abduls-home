import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { RefreshInsightsButton } from '@/components/analytics/refresh-button';
import { MAX_TRACKED_DAYS } from '@/lib/analytics/refresh-policy';

interface PostMetrics {
  reach: number | null;
  clicks: number | null;
  reactions: number | null;
  comments: number | null;
  shares: number | null;
  fetchedAt: string;
}

/** A metric Meta didn't return must never render as 0. */
function Metric({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-300">—</span>;
  return <>{value.toLocaleString('en-AU')}</>;
}

function sum(values: (number | null)[]): number | null {
  const known = values.filter((value): value is number => value !== null);
  return known.length ? known.reduce((total, value) => total + value, 0) : null;
}

export default async function AnalyticsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: business } = await supabase
    .from('businesses')
    .select('id, timezone')
    .eq('owner_id', user.id)
    .maybeSingle();
  if (!business) redirect('/onboarding');

  const { data: posts } = await supabase
    .from('posts')
    .select('id, caption, category, published_at, facebook_post_id')
    .eq('business_id', business.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(50);

  const publishedPosts = posts ?? [];

  // Newest snapshot per post.
  const metricsByPost = new Map<string, PostMetrics>();
  if (publishedPosts.length) {
    const { data: rows } = await supabase
      .from('post_insights')
      .select('post_id, reach, clicks, reactions, comments, shares, fetched_at')
      .in(
        'post_id',
        publishedPosts.map((post) => post.id)
      )
      .order('fetched_at', { ascending: false });

    for (const row of rows ?? []) {
      if (metricsByPost.has(row.post_id)) continue;
      metricsByPost.set(row.post_id, {
        reach: row.reach,
        clicks: row.clicks,
        reactions: row.reactions,
        comments: row.comments,
        shares: row.shares,
        fetchedAt: row.fetched_at,
      });
    }
  }

  const all = Array.from(metricsByPost.values());
  const totals = {
    reach: sum(all.map((metrics) => metrics.reach)),
    reactions: sum(all.map((metrics) => metrics.reactions)),
    comments: sum(all.map((metrics) => metrics.comments)),
    shares: sum(all.map((metrics) => metrics.shares)),
  };
  const totalEngagement = sum([totals.reactions, totals.comments, totals.shares]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Analytics</h1>
          <p className="text-sm text-slate-400">
            How your published posts performed, straight from Facebook.
          </p>
        </div>
        <RefreshInsightsButton />
      </div>

      {publishedPosts.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-10 text-center">
            <p className="text-sm text-slate-300">Nothing published yet.</p>
            <p className="text-sm text-slate-400">
              Once posts go out, their numbers appear here.{' '}
              <Link href="/calendar" className="text-indigo-300 hover:underline">
                Check your calendar
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card>
              <CardContent>
                <p className="text-xs uppercase tracking-wide text-slate-400">People reached</p>
                <p className="text-2xl font-semibold text-white">
                  <Metric value={totals.reach} />
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-xs uppercase tracking-wide text-slate-400">Reactions</p>
                <p className="text-2xl font-semibold text-white">
                  <Metric value={totals.reactions} />
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-xs uppercase tracking-wide text-slate-400">Comments</p>
                <p className="text-2xl font-semibold text-white">
                  <Metric value={totals.comments} />
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Engagement
                  <span className="ml-1 normal-case text-slate-400">(sum)</span>
                </p>
                <p className="text-2xl font-semibold text-white">
                  <Metric value={totalEngagement} />
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-white">Per post</h2>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-2 font-medium">Post</th>
                    <th className="px-3 py-2 text-right font-medium">Reach</th>
                    <th className="px-3 py-2 text-right font-medium">Reactions</th>
                    <th className="px-3 py-2 text-right font-medium">Comments</th>
                    <th className="px-3 py-2 text-right font-medium">Shares</th>
                    <th className="px-5 py-2 text-right font-medium">Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {publishedPosts.map((post) => {
                    const metrics = metricsByPost.get(post.id);
                    return (
                      <tr key={post.id} className="border-b border-slate-50 last:border-0">
                        <td className="max-w-xs px-5 py-3">
                          <p className="truncate text-white">{post.caption}</p>
                          <p className="text-xs text-slate-400">
                            {post.published_at
                              ? new Date(post.published_at).toLocaleDateString('en-AU', {
                                  timeZone: business.timezone,
                                  day: 'numeric',
                                  month: 'short',
                                })
                              : '—'}{' '}
                            · {post.category.replace(/_/g, ' ')}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          <Metric value={metrics?.reach ?? null} />
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          <Metric value={metrics?.reactions ?? null} />
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          <Metric value={metrics?.comments ?? null} />
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          <Metric value={metrics?.shares ?? null} />
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums">
                          <Metric value={metrics?.clicks ?? null} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      <p className="text-xs text-slate-400">
        A dash means Facebook didn&apos;t report that number — not that it was zero. Reach and
        clicks come from Page Insights, which Meta withholds for Pages with very small audiences.
        Engagement is reactions, comments and shares added together. Numbers refresh hourly for
        the first two days after publishing, then daily for {MAX_TRACKED_DAYS} days.
      </p>
    </div>
  );
}
