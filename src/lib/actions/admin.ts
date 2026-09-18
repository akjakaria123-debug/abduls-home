'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/admin';
import type { createAdminClient } from '@/lib/supabase/admin';

export type AdminActionResult = { error: string } | { success: true; message: string };

type AdminClient = ReturnType<typeof createAdminClient>;

/** Every admin action is auditable — who did what, to whom, when. */
async function recordAdminAction(
  admin: AdminClient,
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata: Record<string, unknown> = {}
) {
  await admin.from('admin_logs').insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    metadata: metadata as never,
  });
}

export async function setUserSuspendedAction(
  userId: string,
  suspended: boolean
): Promise<AdminActionResult> {
  const { user, admin } = await requireAdmin();

  if (userId === user.id) {
    return { error: 'You cannot suspend your own account.' };
  }

  const { data: target } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (!target) return { error: 'User not found.' };
  if (target.role === 'admin') {
    return { error: 'Admins cannot be suspended from here.' };
  }

  const { error } = await admin
    .from('profiles')
    .update({ suspended_at: suspended ? new Date().toISOString() : null })
    .eq('id', userId);

  if (error) return { error: 'Could not update that user.' };

  await recordAdminAction(
    admin,
    user.id,
    suspended ? 'suspend_user' : 'unsuspend_user',
    'profile',
    userId
  );

  revalidatePath('/admin/users');
  return {
    success: true,
    message: suspended ? 'User suspended. Their posts will stop publishing.' : 'User restored.',
  };
}

export async function changeBusinessPlanAction(
  businessId: string,
  planId: string | null
): Promise<AdminActionResult> {
  const { user, admin } = await requireAdmin();

  const { error } = await admin
    .from('subscriptions')
    .update({ plan_id: planId })
    .eq('business_id', businessId);

  if (error) return { error: 'Could not change that plan.' };

  await recordAdminAction(admin, user.id, 'change_plan', 'business', businessId, { planId });

  revalidatePath('/admin/users');
  return {
    success: true,
    // Worth being explicit: this moves entitlements, not money.
    message: 'Plan changed in the app. Stripe billing is unchanged — adjust it there separately.',
  };
}

const planUpdateSchema = z.object({
  planId: z.string().uuid(),
  name: z.string().trim().min(1, 'Name is required').max(60),
  priceAud: z.coerce.number().min(0).max(10_000),
  maxPages: z.coerce.number().int().min(0).max(100),
  maxPostsPerDay: z.coerce.number().int().min(0).max(5),
  stripePriceId: z.string().trim().max(255).optional().or(z.literal('')),
  isActive: z.union([z.literal('on'), z.literal(null), z.literal('')]).optional(),
});

export async function updatePlanAction(
  _prevState: AdminActionResult | null,
  formData: FormData
): Promise<AdminActionResult> {
  const { user, admin } = await requireAdmin();

  const parsed = planUpdateSchema.safeParse({
    planId: formData.get('planId'),
    name: formData.get('name'),
    priceAud: formData.get('priceAud'),
    maxPages: formData.get('maxPages'),
    maxPostsPerDay: formData.get('maxPostsPerDay'),
    stripePriceId: formData.get('stripePriceId'),
    isActive: formData.get('isActive'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the plan details.' };
  }

  const { error } = await admin
    .from('plans')
    .update({
      name: parsed.data.name,
      price_aud: parsed.data.priceAud,
      max_pages: parsed.data.maxPages,
      max_posts_per_day: parsed.data.maxPostsPerDay,
      stripe_price_id: parsed.data.stripePriceId || null,
      is_active: parsed.data.isActive === 'on',
    })
    .eq('id', parsed.data.planId);

  if (error) return { error: 'Could not save that plan.' };

  await recordAdminAction(admin, user.id, 'edit_plan', 'plan', parsed.data.planId, {
    priceAud: parsed.data.priceAud,
    maxPages: parsed.data.maxPages,
    maxPostsPerDay: parsed.data.maxPostsPerDay,
  });

  revalidatePath('/admin/pricing');
  revalidatePath('/billing');
  revalidatePath('/');
  return {
    success: true,
    message: 'Plan saved. Changing the price here does not change what existing subscribers pay.',
  };
}
