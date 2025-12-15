import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { signIn } from '@/../auth';

// Helper to get correct origin with HTTPS for production
async function getOrigin(): Promise<string> {
    const headersList = await headers();
    const host = headersList.get('x-forwarded-host') || headersList.get('host') || '';
    const proto = host.includes('localhost') ? 'http' : 'https';
    return `${proto}://${host}`;
}

/**
 * GET /api/auth/discord/login
 * Signs in a user who has their Discord linked to an existing account
 * This is called after Discord OAuth callback when user is not logged in but has a linked account
 */
export async function GET(request: Request) {
    const origin = await getOrigin();

    try {
        const { searchParams } = new URL(request.url);
        const discordId = searchParams.get('discordId');
        const callbackUrl = searchParams.get('callbackUrl') || '/';

        if (!discordId) {
            return NextResponse.redirect(new URL('/login?error=Missing%20Discord%20ID', origin));
        }

        // Use NextAuth's signIn with the discord-login credentials provider
        // We'll sign in using a special flow that accepts discordId
        const result = await signIn('discord-id', {
            discordId,
            redirect: false,
        });

        if (result?.error) {
            console.error('[Discord Login] Sign in failed:', result.error);
            return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(result.error)}`, origin));
        }

        // Redirect to the callback URL on success
        return NextResponse.redirect(new URL(callbackUrl, origin));
    } catch (error) {
        console.error('[Discord Login] Error:', error);
        return NextResponse.redirect(new URL('/login?error=Discord%20login%20failed', origin));
    }
}
