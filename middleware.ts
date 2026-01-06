import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { env } from '@/lib/env';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /control/* routes
  if (pathname.startsWith('/control/')) {
    const slug = pathname.split('/control/')[1]?.split('/')[0];
    
    // Check if slug matches the secret admin panel slug
    const expectedSlug = env.adminPanelSlug();
    if (slug !== expectedSlug) {
      // Return 404 for wrong slug
      return NextResponse.rewrite(new URL('/404', request.url));
    }

    // Create Supabase client for middleware
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            // In middleware, we can't set cookies directly, so we'll handle this in the page
          },
        },
      }
    );

    // Check for Supabase session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      // Redirect to login if no session
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check if user is admin in database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      // Redirect to home if not admin
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Check for admin_gate cookie
    const adminGateCookie = request.cookies.get('admin_gate');
    
    // Allow access to the password entry page even without cookie
    // But block other admin routes if no cookie
    if (!adminGateCookie && !pathname.endsWith(`/control/${slug}`)) {
      // Redirect to the main admin page to enter password
      return NextResponse.redirect(new URL(`/control/${slug}`, request.url));
    }

    // All checks passed, allow access
    return NextResponse.next();
  }

  // Allow all other routes
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/control/:path*',
  ],
};

