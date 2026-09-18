'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/crypto/token-encryption';
import { debugToken, revokeUserPermissions, MetaGraphError } from '@/lib/meta/graph';
import { logApiCall } from '@/lib/api-logs';
import { getPageLimit } from '@/lib/plans';

export type FacebookActionResult = { error: string } | { success: true };

async function getOwnedBusinessId(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();

  return business?.id ?? null;
}

function refreshViews() {
  revalidatePath('/facebook-pages');
  revalidatePath('/dashboard');
}

export async function togglePageSelectionAction(
  pageId: string,
  select: boolean
): Promise<FacebookActionResult> {
  const supabase = createClient();
  const businessId = await getOwnedBusinessId(supabase);
  if (!businessId) return { error: 'Your session expired. Please log in again.' };

  // Scoping the lookup to the business is what stops one user toggling
  // another user's Page, independently of RLS.
  const { data: page } = await supabase
    .from('facebook_pages')
    .select('id')
    .eq('id', pageId)
    .eq('business_id', businessId)
    .maybeSingle();

  if (!page) return { error: 'Page not found.' };

  if (select) {
    const limit = await getPageLimit(supabase, businessId);
    const { count } = await supabase
      .from('facebook_pages')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('is_selected', true);

    if ((count ?? 0) >= limit) {
      return {
        error:
          limit === 0
            ? 'Your trial has ended. Choose a plan in Billing to activate a Page.'
            : `Your plan allows up to ${limit} active Page${limit === 1 ? '' : 's'}. Upgrade to add more.`,
      };
    }
  }

  const { error } = await supabase
    .from('facebook_pages')
    .update({ is_selected: select })
    .eq('id', pageId);

  if (error) return { error: 'Could not update this Page. Please try again.' };

  refreshViews();
  return { success: true };
}

export async function disconnectFacebookAction(): Promise<FacebookActionResult> {
  const supabase = createClient();
  const businessId = await getOwnedBusinessId(supabase);
  if (!businessId) return { error: 'Your session expired. Please log in again.' };

  const { data: connection } = await supabase
    .from('facebook_connections')
    .select('id, long_lived_user_token_encrypted')
    .eq('business_id', businessId)
    .eq('status', 'active')
    .order('connected_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!connection) return { error: 'No active Facebook connection found.' };

  try {
    await revokeUserPermissions(decryptToken(connection.long_lived_user_token_encrypted));
    await logApiCall({
      businessId,
      service: 'meta',
      endpoint: '/me/permissions',
      success: true,
    });
  } catch (error) {
    // If the token is already dead Meta rejects the revoke — disconnect
    // locally anyway rather than trapping the user in a broken state.
    await logApiCall({
      businessId,
      service: 'meta',
      endpoint: '/me/permissions',
      success: false,
      statusCode: error instanceof MetaGraphError ? error.status : null,
      errorMessage:
        error instanceof MetaGraphError ? error.message : 'Unknown error revoking permissions.',
    });
  }

  await supabase
    .from('facebook_connections')
    .update({ status: 'revoked', disconnected_at: new Date().toISOString() })
    .eq('id', connection.id);

  await supabase
    .from('facebook_pages')
    .update({ is_selected: false, token_status: 'invalid' })
    .eq('business_id', businessId);

  refreshViews();
  return { success: true };
}

export async function verifyConnectionAction(): Promise<FacebookActionResult> {
  const supabase = createClient();
  const businessId = await getOwnedBusinessId(supabase);
  if (!businessId) return { error: 'Your session expired. Please log in again.' };

  const { data: pages } = await supabase
    .from('facebook_pages')
    .select('id, page_access_token_encrypted')
    .eq('business_id', businessId);

  if (!pages?.length) return { success: true };

  const checkedAt = new Date().toISOString();

  for (const page of pages) {
    let tokenStatus = 'needs_reauth';

    try {
      const info = await debugToken(decryptToken(page.page_access_token_encrypted));
      tokenStatus = info.is_valid ? 'valid' : 'needs_reauth';
    } catch (error) {
      await logApiCall({
        businessId,
        service: 'meta',
        endpoint: '/debug_token',
        success: false,
        statusCode: error instanceof MetaGraphError ? error.status : null,
        errorMessage:
          error instanceof MetaGraphError ? error.message : 'Unknown error checking token.',
      });
    }

    await supabase
      .from('facebook_pages')
      .update({ token_status: tokenStatus, last_token_check_at: checkedAt })
      .eq('id', page.id);
  }

  refreshViews();
  return { success: true };
}
