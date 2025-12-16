import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/db';
import { users, serverXp, friendships, forumPosts } from '@/db/schema';
import { eq, or, and, count } from 'drizzle-orm';
import { sanitizeForDb, sanitizeUrl, sanitizeEnum } from '@/lib/sanitize';

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

/**
 * PATCH /api/users/me
 * Updates the current authenticated user's settings (avatar settings, profile info)
 */
export async function PATCH(request: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const userId = parseInt(session.user.id);
        const body = await request.json();

        // Build update object for allowed fields
        const updateData: Record<string, unknown> = {};

        // Avatar settings - sanitize enum values
        if (body.avatarAnimation !== undefined) {
            updateData.avatarAnimation = sanitizeEnum(body.avatarAnimation, ['walking', 'running', 'idle', 'none'] as const, 'walking');
        }
        if (body.avatarAutoRotate !== undefined) {
            updateData.avatarAutoRotate = Boolean(body.avatarAutoRotate);
        }
        if (body.avatarRotateSpeed !== undefined) {
            const speed = parseFloat(body.avatarRotateSpeed);
            if (!isNaN(speed) && speed >= 0 && speed <= 2) {
                updateData.avatarRotateSpeed = speed;
            }
        }
        if (body.avatarZoom !== undefined) {
            const zoom = parseFloat(body.avatarZoom);
            if (!isNaN(zoom) && zoom >= 0.5 && zoom <= 2) {
                updateData.avatarZoom = zoom;
            }
        }
        if (body.avatarAnimationSpeed !== undefined) {
            const animSpeed = parseFloat(body.avatarAnimationSpeed);
            if (!isNaN(animSpeed) && animSpeed >= 0.1 && animSpeed <= 3) {
                updateData.avatarAnimationSpeed = animSpeed;
            }
        }
        if (body.avatarShowNameTag !== undefined) {
            updateData.avatarShowNameTag = Boolean(body.avatarShowNameTag);
        }

        // Profile settings - sanitize text inputs
        if (body.bio !== undefined) {
            updateData.bio = sanitizeForDb(body.bio, 500, true);
        }
        if (body.avatar !== undefined) {
            // Allow null to remove avatar, or validate URL
            updateData.avatar = body.avatar ? sanitizeUrl(body.avatar) : null;
        }
        if (body.minecraftUsername !== undefined) {
            // Minecraft usernames: alphanumeric + underscore, 3-16 chars
            const mcName = sanitizeForDb(body.minecraftUsername, 16, false);
            if (mcName && /^[a-zA-Z0-9_]{3,16}$/.test(mcName)) {
                updateData.minecraftUsername = mcName;
            }
        }

        // Discord unlinking (allow setting to null)
        if ('discordId' in body) {
            updateData.discordId = body.discordId;
        }
        if ('discordUsername' in body) {
            updateData.discordUsername = body.discordUsername;
        }
        if ('discordAvatar' in body) {
            updateData.discordAvatar = body.discordAvatar;
        }

        // Update user
        if (Object.keys(updateData).length > 0) {
            updateData.updatedAt = new Date();

            await db.update(users)
                .set(updateData)
                .where(eq(users.id, userId));
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error updating user data:', error);
        return NextResponse.json(
            { error: 'Failed to update user data' },
            { status: 500 }
        );
    }
}
