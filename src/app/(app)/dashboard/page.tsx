import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Facebook, FileText, CalendarCheck, XCircle, Clock, TrendingUp, CreditCard } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { StatCard } from '@/components/dashboard/stat-card';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('owner_id', user.id)
    .maybeSingle();
  if (!business) redirect('/onboarding');

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    { count: connectedPages },
    { count: postsGenerated },
    { count: postsScheduled },
    { count: postsPublished },
    { count: postsFailed },
    { count: postsToday },
    { count: postsThisMonth },
    { data: subscription },
    { data: upcomingPosts },
  ] = await Promise.all([
    supabase
      .from('facebook_pages')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .eq('is_selected', true),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('business_id', business.id),
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .eq('status', 'scheduled'),
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .eq('status', 'published'),
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .eq('status', 'failed'),
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .gte('scheduled_at', startOfToday.toISOString()),
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .gte('created_at', startOfMonth.toISOString()),
    supabase
      .from('subscriptions')
      .select('status, trial_ends_at')
      .eq('business_id', business.id)
      .maybeSingle(),
    supabase
      .from('posts')
      .select('id, caption, category, scheduled_at')
      .eq('business_id', business.id)
      .eq('status', 'scheduled')
      .order('scheduled_at', { ascending: true })
      .limit(5),
  ]);

  const trialDaysLeft = subscription?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / 86_400_000))
    : null;

  const planLabel =
    subscription?.status === 'trialing' && trialDaysLeft !== null
      ? `Trial · ${trialDaysLeft}d left`
      : subscription?.status ?? 'No plan';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Welcome back</h1>
        <p className="text-sm text-slate-400">Here&apos;s what&apos;s happening with {business.name}.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Connected Pages" value={connectedPages ?? 0} icon={Facebook} />
        <StatCard label="Posts generated" value={postsGenerated ?? 0} icon={FileText} />
        <StatCard label="Scheduled" value={postsScheduled ?? 0} icon={Clock} />
        <StatCard label="Published" value={postsPublished ?? 0} icon={CalendarCheck} />
        <StatCard label="Failed" value={postsFailed ?? 0} icon={XCircle} />
        <StatCard label="Posts today" value={postsToday ?? 0} icon={TrendingUp} />
        <StatCard label="Posts this month" value={postsThisMonth ?? 0} icon={TrendingUp} />
        <StatCard label="Plan" value={planLabel} icon={CreditCard} />
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Next scheduled posts</h2>
          <Link href="/calendar" className="text-sm text-indigo-300 hover:underline">
            View calendar
          </Link>
        </CardHeader>
        <CardContent>
          {upcomingPosts && upcomingPosts.length > 0 ? (
            <ul className="divide-y divide-white/5">
              {upcomingPosts.map((post) => (
                <li key={post.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{post.caption}</p>
                    <p className="text-slate-400 capitalize">{post.category.replace(/_/g, ' ')}</p>
                  </div>
                  <span className="shrink-0 text-slate-400">
                    {post.scheduled_at ? new Date(post.scheduled_at).toLocaleString('en-AU') : '—'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-slate-400">
              No posts scheduled yet. Connect Facebook and set up content generation to get started.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
