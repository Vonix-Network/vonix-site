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
];

export default auth((req) => {
    const { nextUrl } = req;
    const isLoggedIn = !!req.auth;
    const path = nextUrl.pathname;

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
