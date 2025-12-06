import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/settings',
  '/social',
  '/messages',
  '/friends',
  '/groups',
  '/moderation',
  '/notifications',
  '/profile',
  '/forum/new',
  '/events',
  '/donate',
];

// Routes that require admin access
const adminRoutes = [
  '/admin',
];

// Routes that should redirect authenticated users away (guest-only)
const guestOnlyRoutes = [
  '/login',
  '/register',
];

// Rate limiting configuration - generous limits for high-traffic API usage
const rateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 1000, // 1000 requests per minute per IP
};

// Simple in-memory rate limiting (for edge runtime)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + rateLimitConfig.windowMs
    });
    return { allowed: true, remaining: rateLimitConfig.maxRequests - 1 };
  }

  if (record.count >= rateLimitConfig.maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: rateLimitConfig.maxRequests - record.count };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown';

  // Skip setup check for API routes and static files
  if (!pathname.startsWith('/api/') &&
    !pathname.startsWith('/_next/') &&
    pathname !== '/setup') {

    // Check if setup is completed (only check on non-API routes)
    try {
      const setupResponse = await fetch(new URL('/api/setup/status', request.url));
      if (setupResponse.ok) {
        const { isCompleted } = await setupResponse.json();

        // Redirect to setup if not completed
        if (!isCompleted && pathname !== '/setup') {
          return NextResponse.redirect(new URL('/setup', request.url));
        }

        // Redirect from setup to home if already completed
        if (isCompleted && pathname === '/setup') {
          return NextResponse.redirect(new URL('/', request.url));
        }
      }
    } catch (error) {
      // If setup check fails, allow through (might be first run)
      console.error('Setup check failed:', error);
    }
  }

  // Rate limiting for API routes (skip if API key is present)
  if (pathname.startsWith('/api/')) {
    // Check for API key - if present, skip rate limiting entirely
    const apiKey = request.headers.get('x-api-key') ||
      request.headers.get('authorization')?.replace('Bearer ', '');

    // Only apply rate limiting to requests WITHOUT API keys
    if (!apiKey) {
      const rateLimit = checkRateLimit(ip);

      if (!rateLimit.allowed) {
        return new NextResponse(
          JSON.stringify({ error: 'Too many requests. Please try again later.' }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'Retry-After': '60',
            },
          }
        );
      }
    }
  }

  // Security headers for all responses
  const response = NextResponse.next();

  // Add security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('X-Download-Options', 'noopen');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

  // CORS headers for API routes
  if (pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  // Get session token from cookies
  // Support both legacy NextAuth cookie names and Auth.js v5 defaults
  const sessionToken =
    request.cookies.get('next-auth.session-token')?.value ||
    request.cookies.get('__Secure-next-auth.session-token')?.value ||
    request.cookies.get('authjs.session-token')?.value ||
    request.cookies.get('__Secure-authjs.session-token')?.value;

  const isAuthenticated = !!sessionToken;

  // Check route types
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
  const isGuestOnlyRoute = guestOnlyRoutes.some(route => pathname === route);

  // Redirect authenticated users away from guest-only routes (login/register)
  if (isGuestOnlyRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirect unauthenticated users to login for protected routes
  if ((isProtectedRoute || isAdminRoute) && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    if (isAdminRoute) {
      loginUrl.searchParams.set('error', 'AccessDenied');
    }
    return NextResponse.redirect(loginUrl);
  }

  // Note: Admin role verification happens in the admin layout (server-side)
  // Middleware only checks for authentication, not authorization

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

