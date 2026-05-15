import { NextRequest, NextResponse } from 'next/server';

const PROTECTED = [
  '/dashboard',
  '/carousel',
  '/reels',
  '/publish',
  '/accounts',
  '/automation',
  '/settings',
];

async function verifyToken(token: string): Promise<boolean> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;

  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) return false;

  const sigHex = token.slice(0, dotIndex);
  const message = token.slice(dotIndex + 1);

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const sigBytes = new Uint8Array(
      sigHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)),
    );
    return await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      encoder.encode(message),
    );
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const raw = request.cookies.get('__session')?.value;
  const authenticated = raw ? await verifyToken(raw) : false;

  if (pathname === '/login' && authenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  const isProtected = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );
  if (isProtected && !authenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico).*)'],
};
