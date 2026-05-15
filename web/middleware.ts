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

const encoder = new TextEncoder();
const HEX_PAIR = /.{1,2}/g;

let cachedKey: CryptoKey | null = null;
let cachedSecret: string | null = null;

async function getKey(): Promise<CryptoKey | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  if (cachedKey && cachedSecret === secret) return cachedKey;
  cachedKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  cachedSecret = secret;
  return cachedKey;
}

async function verifyToken(token: string): Promise<boolean> {
  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) return false;
  try {
    const key = await getKey();
    if (!key) return false;
    const sigHex = token.slice(0, dotIndex);
    const message = token.slice(dotIndex + 1);
    const sigBytes = new Uint8Array(sigHex.match(HEX_PAIR)!.map((b) => parseInt(b, 16)));
    return await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(message));
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
