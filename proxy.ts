import { NextRequest, NextResponse } from 'next/server';
import { env } from './lib/env';

const PROTECTED_PATHS = ['/player', '/leader', '/monitor', '/admin', '/display'];
const PUBLIC_PATHS = ['/', '/login', '/register', '/api/auth/login', '/api/auth/register', '/api/teams'];

export function proxy(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  
  const allowedHosts = env.ALLOWED_HOSTS.split(',').map(h => h.trim());
  if (!allowedHosts.includes(host)) {
    return new NextResponse('Invalid host', { status: 400 });
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  
  const csp = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'nonce-${nonce}';
    font-src 'self';
    img-src 'self' data:;
    frame-ancestors 'none';
    connect-src 'self';
  `.replace(/\s{2,}/g, ' ').trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  // Cookie gate for protected paths
  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PATHS.some(p => path.startsWith(p));
  const isPublic = PUBLIC_PATHS.some(p => (p === '/' ? path === '/' : path.startsWith(p)));
  
  if (isProtected && !isPublic) {
    const sessionCookie = request.cookies.get('session');
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('Content-Security-Policy', csp);
  return response;
}
