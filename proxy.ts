import { hasAdminRole } from '@/lib/auth/roles';
import { auth } from '@/lib/auth/server';
import { logServerError } from '@/lib/serverLogger';
import { type NextRequest, NextResponse } from 'next/server';

const authenticate = auth.middleware({
  // Redirects unauthenticated users to sign-in page
  loginUrl: '/auth/sign-in',
});

export default async function proxy(request: NextRequest) {
  const response = await authenticate(request);
  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');

  // Check if user is banned (for all protected routes)
  const { data: session, error } = await auth.getSession();
  if (error) {
    logServerError('proxy.session', error);
    if (!isAdminRoute) {
      return new NextResponse(
        'Nie można zweryfikować sesji. Spróbuj ponownie.',
        {
          status: 503,
        },
      );
    }
  } else if (session?.user) {
    // Check if user is banned
    if (session.user.banned) {
      // Sign out the banned user
      await auth.signOut();
      return NextResponse.redirect(
        new URL('/auth/sign-in?banned=true', request.url),
      );
    }
  }

  if (response.headers.has('location')) {
    return response;
  }

  if (!isAdminRoute) {
    return response;
  }

  if (!session?.user) {
    return NextResponse.redirect(new URL('/auth/sign-in', request.url));
  }

  if (!hasAdminRole(session.user.role)) {
    return new NextResponse('Brak uprawnień administratora.', { status: 403 });
  }

  return response;
}

export const config = {
  matcher: [
    // Protected routes requiring authentication
    '/account/:path*',
    '/admin/:path*',
  ],
};
