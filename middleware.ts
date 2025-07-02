import { type NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@/lib/supabase/middleware';
import type { UserProfile, UserRole } from '@/types';
//import { getCurrentUserRole, getAuthenticatedUser } from '@/lib/supabase/utils';

export async function middleware(request: NextRequest) {
  console.log("middleware.ts started")
  const { supabase, response } = createMiddlewareClient(request);

  // Refresh session if expired - required for Server Components
  // https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-session-with-middleware
  await supabase.auth.getSession();

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;


  // Auth routes: if user is logged in and tries to access login/signup, redirect to protected page
  if (user && (pathname === '/auth' || pathname === '/signup')) {
    const { data: profile, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single<{ role: UserRole }>();

    console.log("XXX-profile", profile)

    if (error || !profile) {
      return NextResponse.redirect(new URL('/profile', request.url));
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Protected routes: if user is not logged in and tries to access protected/admin, redirect to login
  if (!user && (pathname.startsWith('/dashboard') || pathname.startsWith('/my-portal'))) {
    console.log("No user accessing database")
    return NextResponse.redirect(new URL(`/auth?redirect_to=${pathname}`, request.url));
  }

  // Check if user is blocked (for logged-in users)
  if (user) {
    const { data: customer, error } = await supabase
      .from('customers')
      .select('status, block_note')
      .eq('user_id', user.id)
      .single();

    // if (!error && customer && customer.status === 'blocked') {
    //   // User is blocked, redirect to blocked page
    //   return NextResponse.redirect(new URL('/blocked', request.url));
    // }
  }


  console.log("yyy", pathname.startsWith('/dashboard'))


  // Admin routes: if user is logged in but not an admin and tries to access admin routes, redirect to protected
  if (user && pathname.startsWith('/dashboard')) {

    const { data: profile, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single<{ role: UserRole }>();

    console.log("XXX-profile", profile)

    if (error || !profile) {
      return NextResponse.redirect(new URL('/auth?redirect_to=/dashboard', request.url));
    }

    console.log("XXX")
    console.log("userRole", profile.role)
    if (profile.role !== 'admin') {
      return NextResponse.redirect(new URL('/auth?redirect_to=/dashboard', request.url));
    }
  }


  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/ (API routes)
     * - auth/ (auth routes like callback)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/|auth/callback).*)',
  ],
};