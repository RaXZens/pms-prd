import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  
  // Pages that require login
  const isProtected = pathname.startsWith('/book') || pathname.startsWith('/dashboard') || pathname.startsWith('/my-bookings');
  
  // Public pages — never redirect
  const isPublic = pathname === '/login' || pathname === '/register' || pathname === '/';
  
  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL('/login', req.nextUrl);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return Response.redirect(loginUrl);
  }

  // Dashboard protection: requires role === 'ADMIN'
  const role = (req.auth?.user as any)?.role;
  if (pathname.startsWith('/dashboard') && role !== 'ADMIN') {
    return Response.redirect(new URL('/', req.nextUrl));
  }

  // Admin cannot use Guest booking flow
  if ((pathname.startsWith('/book') || pathname.startsWith('/my-bookings')) && role === 'ADMIN') {
    return Response.redirect(new URL('/dashboard', req.nextUrl));
  }
  
  // If logged in and visiting login/register, redirect to home
  if (isLoggedIn && (pathname === '/login' || pathname === '/register')) {
    return Response.redirect(new URL('/', req.nextUrl));
  }
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
