import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check for admin_auth cookie
  const adminAuth = request.cookies.get('admin_auth');

  // If no auth cookie, redirect to login
  if (!adminAuth) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // Allow request to continue
  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path((?!login).*)*',
};
