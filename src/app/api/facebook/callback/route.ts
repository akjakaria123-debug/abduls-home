import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { encryptToken } from '@/lib/crypto/token-encryption';
import { logApiCall } from '@/lib/api-logs';
import {
  exchangeCodeForUserToken,
  exchangeForLongLivedUserToken,
  fetchMetaUserId,
  fetchUserPages,
  assertPageScopesGranted,
  MissingPermissionsError,
  MetaGraphError,
} from '@/lib/meta/graph';
import { OAUTH_STATE_COOKIE, facebookRedirectUri } from '@/lib/meta/oauth';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const back = (query: string) => NextResponse.redirect(`${origin}/facebook-pages?${query}`);

  // The user hit "Cancel" on Facebook's consent dialog.
  if (searchParams.get('error')) {
    return back('error=oauth_denied');
  }

  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const cookieStore = cookies();
  const expectedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(OAUTH_STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    return back('error=invalid_state');
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!business) {
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  try {
    const shortLived = await exchangeCodeForUserToken(code, facebookRedirectUri());
    const longLived = await exchangeForLongLivedUserToken(shortLived.access_token);
    // Check what was actually granted before using it, so a declined or
    // skipped permission is reported as such rather than surfacing later
    // as an unrelated-looking Graph API error.
    const grantedScopes = await assertPageScopesGranted(longLived.access_token);
    const metaUserId = await fetchMetaUserId(longLived.access_token);
    const pages = await fetchUserPages(longLived.access_token);

    await logApiCall({
      businessId: business.id,
      service: 'meta',
      endpoint: '/oauth/access_token',
      success: true,
    });

    if (pages.length === 0) {
      return back('error=no_pages_found');
    }

    const tokenExpiresAt = longLived.expires_in
      ? new Date(Date.now() + longLived.expires_in * 1000).toISOString()
      : null;

    const { data: connection, error: connectionError } = await supabase
      .from('facebook_connections')
      .insert({
        business_id: business.id,
        meta_user_id: metaUserId,
        long_lived_user_token_encrypted: encryptToken(longLived.access_token),
        token_expires_at: tokenExpiresAt,
        scopes: grantedScopes,
        status: 'active',
      })
      .select('id')
      .single();

    if (connectionError || !connection) {
      return back('error=save_failed');
    }

    // A reconnect supersedes the previous grant. Old rows stay for audit.
    await supabase
      .from('facebook_connections')
      .update({ status: 'replaced', disconnected_at: new Date().toISOString() })
      .eq('business_id', business.id)
      .eq('status', 'active')
      .neq('id', connection.id);

    const checkedAt = new Date().toISOString();

    // Upsert keyed on (business_id, page_id): a reconnect refreshes the
    // token and connection without touching is_selected or post history.
    for (const page of pages) {
      const { error: pageError } = await supabase.from('facebook_pages').upsert(
        {
          connection_id: connection.id,
          business_id: business.id,
          page_id: page.id,
          page_name: page.name,
          page_access_token_encrypted: encryptToken(page.access_token),
          permissions: page.tasks ?? [],
          token_status: 'valid',
          last_token_check_at: checkedAt,
        },
        { onConflict: 'business_id,page_id' }
      );

      if (pageError) {
        return back('error=save_failed');
      }
    }

    return back('connected=1');
  } catch (error) {
    const message =
      error instanceof MissingPermissionsError || error instanceof MetaGraphError
        ? error.message
        : 'Something went wrong connecting Facebook.';

    await logApiCall({
      businessId: business.id,
      service: 'meta',
      endpoint: '/oauth/access_token',
      success: false,
      statusCode: error instanceof MetaGraphError ? error.status : null,
      errorMessage: message,
    });

    return back(`error=${encodeURIComponent(message)}`);
  }
}
