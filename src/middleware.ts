import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { supabaseAnonKey, supabaseUrl } from '@/lib/supabase/env';

const PROTECTED_PREFIXES = [
  '/admin',
  '/assistant',
  '/dashboard',
  '/content',
  '/calendar',
  '/facebook-pages',
  '/analytics',
  '/billing',
  '/settings',
  '/onboarding',
];
const AUTH_PAGES = ['/login', '/signup'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const url = supabaseUrl();
  const anonKey = supabaseAnonKey();

  // Middleware runs on every route, so throwing here takes the entire site
  // down — including the landing page, which needs no database at all.
  // If it isn't configured, step aside. Pages that genuinely need a session
  // check it again themselves, so nothing is left unguarded.
  if (!url || !anonKey) {
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const path = request.nextUrl.pathname;

  try {
    // Refreshes the session token if needed — required so server components
    // downstream see a valid session rather than a stale/expired cookie.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isProtected = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
    const isAuthPage = AUTH_PAGES.some((p) => path === p || path.startsWith(`${p}/`));

    if (!user && isProtected) {
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirectTo', path);
      return NextResponse.redirect(redirectUrl);
    }

    if (user && isAuthPage) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Route users without a business into onboarding, and users who already
    // have one away from onboarding. The admin area is exempt: an admin is
    // not necessarily a customer and may have no business of their own.
    const isAdminArea = path === '/admin' || path.startsWith('/admin/');

    if (user && !isAdminArea && (isProtected || path === '/onboarding')) {
      const { count } = await supabase
        .from('businesses')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', user.id);

      const hasBusiness = Boolean(count && count > 0);

      if (!hasBusiness && path !== '/onboarding') {
        return NextResponse.redirect(new URL('/onboarding', request.url));
      }
      if (hasBusiness && path === '/onboarding') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  } catch {
    // A bad URL, an expired key or a Supabase outage must not blank the
    // whole site. Let the request through; pages that need a session
    // re-check it and will send the visitor to /login themselves.
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
