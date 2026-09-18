import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { buildFacebookOAuthUrl } from '@/lib/meta/graph';
import { OAUTH_STATE_COOKIE, facebookRedirectUri } from '@/lib/meta/oauth';

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // CSRF protection: Facebook echoes `state` back to the callback, which
  // compares it against this cookie before trusting the response.
  const state = randomBytes(16).toString('hex');
  cookies().set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });

  return NextResponse.redirect(buildFacebookOAuthUrl(facebookRedirectUri(), state));
}
