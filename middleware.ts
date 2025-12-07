import { auth } from './auth';
import { NextResponse } from 'next/server';
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
];

// Routes that should redirect to dashboard if already authenticated
const authRoutes = ['/login', '/register'];

// Routes that should be accessible even during maintenance mode
// Keep this minimal - only login and essential API routes
const maintenanceBypassRoutes = [
    '/login',
    '/api/auth',
    '/api/admin',
    '/admin',
    '/maintenance',
    '/_next',
    '/favicon.ico',
];

// Staff roles that can bypass maintenance mode
const staffRoles = ['admin', 'superadmin', 'moderator'];

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

export default auth(async (req) => {
    const { nextUrl } = req;
    const isLoggedIn = !!req.auth;
    const path = nextUrl.pathname;
    const user = req.auth?.user as any;

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

    // If user is logged in and trying to access auth routes, redirect to dashboard
    if (isLoggedIn && isAuthRoute) {
        return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }

    // If user is not logged in and trying to access protected routes, redirect to login
    if (!isLoggedIn && isProtectedRoute) {
        const loginUrl = new URL('/login', nextUrl);
        loginUrl.searchParams.set('callbackUrl', path);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
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
