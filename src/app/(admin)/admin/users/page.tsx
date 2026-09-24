import { requireAdmin } from '@/lib/auth/admin';
import { Card, CardContent } from '@/components/ui/card';
import { UserRowActions } from '@/components/admin/user-row-actions';

export default async function AdminUsersPage() {
  const { admin } = await requireAdmin();

  const [{ data: profiles }, { data: businesses }, { data: subscriptions }, { data: plans }] =
    await Promise.all([
      admin
        .from('profiles')
        .select('id, full_name, role, suspended_at, created_at')
        .order('created_at', { ascending: false })
        .limit(200),
      admin.from('businesses').select('id, name, owner_id'),
      admin.from('subscriptions').select('business_id, status, plan_id, trial_ends_at'),
      admin.from('plans').select('id, name').order('sort_order', { ascending: true }),
    ]);

  const businessByOwner = new Map((businesses ?? []).map((business) => [business.owner_id, business]));
  const subscriptionByBusiness = new Map(
    (subscriptions ?? []).map((subscription) => [subscription.business_id, subscription])
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-white">Users</h1>
        <p className="text-sm text-slate-400">{profiles?.length ?? 0} most recent accounts.</p>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-2 font-medium">User</th>
                <th className="px-3 py-2 font-medium">Business</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-5 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(profiles ?? []).map((profile) => {
                const business = businessByOwner.get(profile.id) ?? null;
                const subscription = business
                  ? subscriptionByBusiness.get(business.id) ?? null
                  : null;
                const suspended = profile.suspended_at !== null;

                return (
                  <tr key={profile.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3">
                      <p className="text-white">{profile.full_name ?? 'Unnamed'}</p>
                      <p className="text-xs text-slate-400">
                        {profile.role === 'admin' && 'admin · '}
                        joined{' '}
                        {new Date(profile.created_at).toLocaleDateString('en-AU', {
                          dateStyle: 'medium',
                        })}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-slate-300">{business?.name ?? '—'}</td>
                    <td className="px-3 py-3">
                      {suspended ? (
                        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-200">
                          Suspended
                        </span>
                      ) : (
                        <span className="text-xs capitalize text-slate-300">
                          {subscription?.status?.replace(/_/g, ' ') ?? 'no subscription'}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <UserRowActions
                        userId={profile.id}
                        businessId={business?.id ?? null}
                        planId={subscription?.plan_id ?? null}
                        suspended={suspended}
                        isAdmin={profile.role === 'admin'}
                        plans={plans ?? []}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
