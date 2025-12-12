import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/db';
import { users, serverXp, friendships, forumPosts } from '@/db/schema';
import { eq, or, and, count } from 'drizzle-orm';

// Force dynamic - always fetch fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/users/me
 * Returns the current authenticated user's data with fresh XP values
 */
export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const userId = parseInt(session.user.id);

        // Fetch fresh user data
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: {
                id: true,
                username: true,
                email: true,
                role: true,
                avatar: true,
                bio: true,
                xp: true,
                level: true,
                websiteXp: true,
                minecraftXp: true,
                minecraftUsername: true,
                minecraftUuid: true,
                createdAt: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Get total XP and playtime from all servers
        const serverXpData = await db.query.serverXp.findMany({
            where: eq(serverXp.userId, userId),
            columns: {
                xp: true,
                playtimeSeconds: true,
            },
        });

        const totalServerXp = serverXpData.reduce(
            (acc, s) => acc + (s.xp || 0),
            0
        );

        const totalPlaytimeSeconds = serverXpData.reduce(
            (acc, s) => acc + (s.playtimeSeconds || 0),
            0
        );

        // Get friend count (accepted friendships where user is either requester or addressee)
        const friendsData = await db.select({ count: count() })
            .from(friendships)
            .where(
                and(
                    or(
                        eq(friendships.userId, userId),
                        eq(friendships.friendId, userId)
                    ),
                    eq(friendships.status, 'accepted')
                )
            );
        const friendCount = friendsData[0]?.count || 0;

        // Get post count
        const postsData = await db.select({ count: count() })
            .from(forumPosts)
            .where(eq(forumPosts.authorId, userId));
        const postCount = postsData[0]?.count || 0;

        return NextResponse.json({
            ...user,
            totalServerXp,
            friendCount,
            postCount,
            playtimeSeconds: totalPlaytimeSeconds,
        });

    } catch (error) {
        console.error('Error fetching user data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch user data' },
            { status: 500 }
        );
    }
}

