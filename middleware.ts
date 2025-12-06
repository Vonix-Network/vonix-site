import { auth } from './auth';
import { NextResponse } from 'next/server';

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

// Routes that are publicly accessible (no auth check needed)
const publicRoutes = [
    '/',
    '/servers',
    '/forum',
    '/leaderboard',
    '/donate',
    '/events',
    '/profile',
    '/api',
    '/maintenance',
];

// Routes that should be accessible even during maintenance mode
const maintenanceBypassRoutes = [
    '/login',
    '/api/auth',
    '/api/admin',
    '/admin',
    '/maintenance',
    '/_next',
];

// Staff roles that can bypass maintenance mode
const staffRoles = ['admin', 'superadmin', 'moderator'];

export default auth(async (req) => {
    const { nextUrl } = req;
    const isLoggedIn = !!req.auth;
    const path = nextUrl.pathname;
    const user = req.auth?.user as any;

    // Check if path should bypass maintenance checks
    const bypassMaintenance = maintenanceBypassRoutes.some(route => path.startsWith(route));

    // Check maintenance mode (only for routes that don't bypass)
    if (!bypassMaintenance) {
        try {
            // Check if maintenance mode is enabled via API
            const maintenanceResponse = await fetch(`${nextUrl.origin}/api/settings/maintenance`, {
                cache: 'no-store',
            });

            if (maintenanceResponse.ok) {
                const data = await maintenanceResponse.json();

                if (data.maintenanceMode) {
                    // Check if user is staff
                    const isStaff = isLoggedIn && user?.role && staffRoles.includes(user.role);

                    if (!isStaff) {
                        // Redirect to maintenance page
                        return NextResponse.redirect(new URL('/maintenance', nextUrl));
                    }
                }
            }
        } catch (error) {
            // If we can't check maintenance mode, allow the request
            console.error('Failed to check maintenance mode:', error);
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
         * - API routes that don't need auth protection handled by middleware
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
    ],
};
