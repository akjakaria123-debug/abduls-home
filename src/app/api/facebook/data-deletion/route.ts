import { NextResponse } from 'next/server';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { logApiCall } from '@/lib/api-logs';

export const dynamic = 'force-dynamic';

// Meta calls this when someone removes the app from their Facebook
// account. We must delete the data we obtained from Facebook and reply
// with a URL and confirmation code they can use to check on it.
//
// Meta sends a `signed_request`: "<base64url signature>.<base64url payload>",
// signed with our app secret. An unsigned or wrongly signed request is
// someone else asking us to delete a stranger's data, so it is rejected.

function base64UrlDecode(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

interface SignedRequestPayload {
  user_id?: string;
  algorithm?: string;
}

function parseSignedRequest(signedRequest: string, appSecret: string): SignedRequestPayload | null {
  const [encodedSignature, encodedPayload] = signedRequest.split('.');
  if (!encodedSignature || !encodedPayload) return null;

  const expected = createHmac('sha256', appSecret).update(encodedPayload).digest();
  const provided = base64UrlDecode(encodedSignature);

  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload).toString('utf8'));
    // Meta documents HMAC-SHA256; anything else is not a request we trust.
    if (payload.algorithm && String(payload.algorithm).toUpperCase() !== 'HMAC-SHA256') {
      return null;
    }
    return payload as SignedRequestPayload;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const appSecret = process.env.META_APP_SECRET;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';

  if (!appSecret) {
    return NextResponse.json({ error: 'Not configured.' }, { status: 500 });
  }

  // Meta posts this as a form field.
  let signedRequest: string | null = null;
  try {
    const form = await request.formData();
    signedRequest = String(form.get('signed_request') ?? '') || null;
  } catch {
    signedRequest = null;
  }

  if (!signedRequest) {
    return NextResponse.json({ error: 'Missing signed_request.' }, { status: 400 });
  }

  const payload = parseSignedRequest(signedRequest, appSecret);
  if (!payload?.user_id) {
    return NextResponse.json({ error: 'Invalid signed_request.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const confirmationCode = randomBytes(12).toString('hex');

  try {
    // Every connection this Meta user made, across any business.
    const { data: connections } = await admin
      .from('facebook_connections')
      .select('id, business_id')
      .eq('meta_user_id', payload.user_id);

    const businessIds = [...new Set((connections ?? []).map((row) => row.business_id))];
    let pagesRemoved = 0;

    if (businessIds.length) {
      const { count } = await admin
        .from('facebook_pages')
        .select('id', { count: 'exact', head: true })
        .in('business_id', businessIds);
      pagesRemoved = count ?? 0;

      // Facebook's own post IDs are Facebook data too. The captions are
      // the customer's own content, so those stay.
      await admin
        .from('posts')
        .update({ facebook_post_id: null })
        .in('business_id', businessIds)
        .not('facebook_post_id', 'is', null);
    }

    // Pages cascade from the connection, taking the encrypted tokens.
    await admin.from('facebook_connections').delete().eq('meta_user_id', payload.user_id);

    await admin.from('data_deletion_requests').insert({
      confirmation_code: confirmationCode,
      meta_user_id: payload.user_id,
      source: 'facebook_callback',
      status: 'completed',
      connections_removed: connections?.length ?? 0,
      pages_removed: pagesRemoved,
      completed_at: new Date().toISOString(),
    });

    await logApiCall({
      service: 'meta',
      endpoint: 'data-deletion-callback',
      success: true,
    });
  } catch (error) {
    await logApiCall({
      service: 'meta',
      endpoint: 'data-deletion-callback',
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Deletion failed.',
    });

    return NextResponse.json({ error: 'Deletion failed.' }, { status: 500 });
  }

  // The exact shape Meta expects back.
  return NextResponse.json({
    url: `${siteUrl}/data-deletion?code=${confirmationCode}`,
    confirmation_code: confirmationCode,
  });
}
