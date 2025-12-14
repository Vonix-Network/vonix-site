import { auth } from './auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db } from '@/db';
import { siteSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Routes that require authentication
const protectedRoutes = [
    '/dashboard',
    '/settings',
    '/friends',
    '/messages',
    '/notifications',
    '/social',
    '/profile',
    '/forum/new',
    '/events',
    '/helpdesk',
];

// Routes that require admin access
const adminRoutes = [
    '/admin',
];

// Routes that should redirect to dashboard if already authenticated
const authRoutes = ['/login', '/register'];

// Routes that should be accessible even during maintenance mode
// API routes are allowed so Minecraft mods and external integrations continue to work
const maintenanceBypassRoutes = [
    '/login',
    '/api',      // All API endpoints (Minecraft mods, webhooks, etc.)
    '/admin',
    '/maintenance',
    '/_next',
    '/favicon.ico',
    '/setup',
];

// Staff roles that can bypass maintenance mode
const staffRoles = ['admin', 'superadmin', 'moderator'];

// Rate limiting configuration - generous limits for high-traffic API usage
const rateLimitConfig = {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 1000, // 1000 requests per minute per IP
};

// Simple in-memory rate limiting
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

// Cache for maintenance mode check to avoid too many DB queries
let maintenanceCache: { enabled: boolean; timestamp: number } | null = null;
const CACHE_TTL = 10000; // 10 seconds cache

async function isMaintenanceModeEnabled(): Promise<boolean> {
    const now = Date.now();

    // Use cache if valid
    if (maintenanceCache && (now - maintenanceCache.timestamp) < CACHE_TTL) {
        return maintenanceCache.enabled;
    }

    try {
        const [setting] = await db
            .select()
            .from(siteSettings)
            .where(eq(siteSettings.key, 'maintenance_mode'));

        const enabled = setting?.value === 'true';
        maintenanceCache = { enabled, timestamp: now };
        return enabled;
    } catch (error) {
        console.error('Failed to check maintenance mode:', error);
        return false; // Default to not in maintenance mode if DB error
    }
}

// Next.js 16 proxy function (replaces middleware.ts)
export default auth(async (req) => {
    const { nextUrl } = req;
    const isLoggedIn = !!req.auth;
    const path = nextUrl.pathname;
    const user = req.auth?.user as any;
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ||
        req.headers.get('x-real-ip') ||
        'unknown';

    // Rate limiting for API routes (skip if API key is present)
    if (path.startsWith('/api/')) {
        const apiKey = req.headers.get('x-api-key') ||
            req.headers.get('authorization')?.replace('Bearer ', '');

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

    // Check if path should bypass maintenance checks
    const bypassMaintenance = maintenanceBypassRoutes.some(route => path.startsWith(route));

    // Check maintenance mode (only for routes that don't bypass)
    if (!bypassMaintenance) {
        const maintenanceEnabled = await isMaintenanceModeEnabled();

        if (maintenanceEnabled) {
            // Check if user is staff
            const isStaff = isLoggedIn && user?.role && staffRoles.includes(user.role);

            if (!isStaff) {
                // Redirect to maintenance page
                return NextResponse.redirect(new URL('/maintenance', nextUrl));
            }
        }
    }

    // Check if path is an auth route (login/register)
    const isAuthRoute = authRoutes.some(route => path.startsWith(route));

    // Check if path is a protected route
    const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));

    // Check if path is an admin route
    const isAdminRoute = adminRoutes.some(route => path.startsWith(route));

    // If user is logged in and trying to access auth routes, redirect to dashboard
    if (isLoggedIn && isAuthRoute) {
        return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }

    // If user is not logged in and trying to access protected or admin routes, redirect to login
    if (!isLoggedIn && (isProtectedRoute || isAdminRoute)) {
        const loginUrl = new URL('/login', nextUrl);
        loginUrl.searchParams.set('callbackUrl', path);
        if (isAdminRoute) {
            loginUrl.searchParams.set('error', 'AccessDenied');
        }
        return NextResponse.redirect(loginUrl);
    }

    // Create response with security headers
    const response = NextResponse.next();

    // Add security headers
    response.headers.set('X-DNS-Prefetch-Control', 'on');
    response.headers.set('X-Download-Options', 'noopen');
    response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

    // CORS headers for API routes
    if (path.startsWith('/api/')) {
        response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
    }

    return response;
});

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (images, etc.)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
    ],
};
