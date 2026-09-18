import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const PROTECTED_PREFIXES = [
  '/admin',
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

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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

  // Refreshes the session token if needed — required so server components
  // downstream see a valid session rather than a stale/expired cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
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

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
