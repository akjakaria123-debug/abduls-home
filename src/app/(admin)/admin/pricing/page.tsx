import { requireAdmin } from '@/lib/auth/admin';
import { PlanEditor } from '@/components/admin/plan-editor';

export default async function AdminPricingPage() {
  const { admin } = await requireAdmin();

  const { data: plans } = await admin
    .from('plans')
    .select('id, key, name, price_aud, max_pages, max_posts_per_day, stripe_price_id, is_active')
    .order('sort_order', { ascending: true });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Pricing & limits</h1>
        <p className="text-sm text-slate-500">
          These drive the marketing page, checkout, and what each plan is allowed to do.
        </p>
      </div>

      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Editing a price here changes what new customers are shown and charged. It does not change
        what existing subscribers pay — that lives in Stripe, and changing it there means migrating
        them to a new Price.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        {(plans ?? []).map((plan) => (
          <PlanEditor
            key={plan.id}
            planId={plan.id}
            planKey={plan.key}
            name={plan.name}
            priceAud={Number(plan.price_aud)}
            maxPages={plan.max_pages}
            maxPostsPerDay={plan.max_posts_per_day}
            stripePriceId={plan.stripe_price_id}
            isActive={plan.is_active}
          />
        ))}
      </div>
    </div>
  );
}
