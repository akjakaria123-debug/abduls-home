import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Handles the redirect back from Supabase after email confirmation,
// password-reset link clicks, and OAuth (Google) sign-in — all of these
// use the same PKCE code-exchange flow.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
