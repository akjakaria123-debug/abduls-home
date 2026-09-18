import 'server-only';
import type { createAdminClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Notifies a business's owner. Used by background work (publishing,
 * Stripe webhooks) that has no user session of its own.
 *
 * Pass an `ownerCache` when notifying repeatedly inside one run — many
 * posts share a business, and the owner lookup shouldn't repeat.
 */
export async function notifyBusinessOwner(
  admin: AdminClient,
  businessId: string,
  type: string,
  message: string,
  ownerCache?: Map<string, string | null>
): Promise<void> {
  let ownerId = ownerCache?.get(businessId);

  if (ownerId === undefined) {
    const { data } = await admin
      .from('businesses')
      .select('owner_id')
      .eq('id', businessId)
      .maybeSingle();

    ownerId = data?.owner_id ?? null;
    ownerCache?.set(businessId, ownerId);
  }

  if (!ownerId) return;

  await admin.from('notifications').insert({ user_id: ownerId, type, message });
}
