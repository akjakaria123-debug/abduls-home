import { requireAdmin } from '@/lib/auth/admin';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardContent>
        <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default async function AdminOverviewPage() {
  const { admin } = await requireAdmin();
  const thirtyDaysAgo = daysAgo(30);
  const sevenDaysAgo = daysAgo(7);

  const [
    { count: totalUsers },
    { count: suspendedUsers },
    { count: trialUsers },
    { count: payingUsers },
    { count: connectedPages },
    { count: postsGenerated },
    { count: postsPublished },
    { count: postsFailed },
    { count: apiErrors },
    { count: activeBusinesses },
    { data: activeSubscriptions },
    { data: plans },
  ] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin.from('profiles').select('id', { count: 'exact', head: true }).not('suspended_at', 'is', null),
    admin.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'trialing'),
    admin.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    admin.from('facebook_pages').select('id', { count: 'exact', head: true }).eq('is_selected', true),
    admin.from('posts').select('id', { count: 'exact', head: true }),
    admin.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    admin.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
    admin
      .from('api_logs')
      .select('id', { count: 'exact', head: true })
      .eq('success', false)
      .gte('created_at', sevenDaysAgo),
    admin
      .from('posts')
      .select('business_id', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo),
    admin.from('subscriptions').select('plan_id').eq('status', 'active'),
    admin.from('plans').select('id, name, price_aud, max_pages, max_posts_per_day, is_active'),
  ]);

  // MRR from what the app believes people are on. Stripe remains the
  // authority on money — this is an indicator, not an invoice.
  const priceByPlan = new Map((plans ?? []).map((plan) => [plan.id, Number(plan.price_aud)]));
  const mrr = (activeSubscriptions ?? []).reduce(
    (total, subscription) =>
      total + (subscription.plan_id ? priceByPlan.get(subscription.plan_id) ?? 0 : 0),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Overview</h1>
        <p className="text-sm text-slate-500">Everything across all accounts.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total users" value={totalUsers ?? 0} />
        <Stat
          label="Active"
          value={activeBusinesses ?? 0}
          hint="created a post in 30 days"
        />
        <Stat label="On trial" value={trialUsers ?? 0} />
        <Stat label="Paying" value={payingUsers ?? 0} />
        <Stat label="MRR" value={`$${mrr.toFixed(2)}`} hint="AUD, from app-side plans" />
        <Stat label="Connected Pages" value={connectedPages ?? 0} />
        <Stat label="Suspended" value={suspendedUsers ?? 0} />
        <Stat label="API errors" value={apiErrors ?? 0} hint="last 7 days" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Posts generated" value={postsGenerated ?? 0} />
        <Stat label="Posts published" value={postsPublished ?? 0} />
        <Stat label="Posts failed" value={postsFailed ?? 0} />
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Plans</h2>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-2 font-medium">Plan</th>
                <th className="px-3 py-2 text-right font-medium">Price</th>
                <th className="px-3 py-2 text-right font-medium">Pages</th>
                <th className="px-3 py-2 text-right font-medium">Posts/day</th>
                <th className="px-5 py-2 text-right font-medium">Subscribers</th>
              </tr>
            </thead>
            <tbody>
              {(plans ?? []).map((plan) => (
                <tr key={plan.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-3 text-slate-800">
                    {plan.name}
                    {!plan.is_active && <span className="ml-2 text-xs text-slate-400">hidden</span>}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">${plan.price_aud}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{plan.max_pages}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{plan.max_posts_per_day}</td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {(activeSubscriptions ?? []).filter((s) => s.plan_id === plan.id).length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
