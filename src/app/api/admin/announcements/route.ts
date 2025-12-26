import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/db';
import { announcements, notifications, users } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { sanitizeForDb, sanitizeContent, sanitizeEnum } from '@/lib/sanitize';

async function requireAdmin() {
    const session = await auth();
    const user = session?.user as any;

    if (!session || !['admin', 'superadmin', 'moderator'].includes(user?.role)) {
        throw new Error('Unauthorized');
    }

    return user;
}

/**
 * GET /api/admin/announcements
 * Get all announcements
 */
export async function GET() {
    try {
        await requireAdmin();

        const allAnnouncements = await db
            .select({
                id: announcements.id,
                title: announcements.title,
                content: announcements.content,
                type: announcements.type,
                published: announcements.published,
                sendNotification: announcements.sendNotification,
                expiresAt: announcements.expiresAt,
                createdAt: announcements.createdAt,
                authorId: announcements.authorId,
            })
            .from(announcements)
            .orderBy(desc(announcements.createdAt));

        return NextResponse.json({ announcements: allAnnouncements });
    } catch (error: any) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Error fetching announcements:', error);
        return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
    }
}

/**
 * POST /api/admin/announcements
 * Create a new announcement
 */
export async function POST(request: NextRequest) {
    try {
        const adminUser = await requireAdmin();
        const body = await request.json();

        // Sanitize inputs
        const title = sanitizeForDb(body.title, 200, false);
        const content = sanitizeContent(body.content, 5000);
        const type = sanitizeEnum(body.type, ['info', 'warning', 'success', 'error'] as const, 'info');
        const published = body.published ?? true;
        const sendNotificationFlag = body.sendNotification ?? true;
        const expiresAt = body.expiresAt;

        if (!title || !content) {
            return NextResponse.json(
                { error: 'Title and content are required' },
                { status: 400 }
            );
        }

        // Create announcement
        const [newAnnouncement] = await db.insert(announcements).values({
            title,
            content,
            type,
            authorId: adminUser.id,
            published,
            sendNotification: sendNotificationFlag,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
        }).returning();

        // If published and sendNotification, create notifications for all users
        if (published && sendNotificationFlag) {
            const allUsers = await db.select({ id: users.id }).from(users);

            // Create notifications in batches
            const notificationValues = allUsers.map((user: any) => ({
                userId: user.id,
                type: 'system' as const,
                title: `📢 ${title}`,
                message: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
                link: '/announcements',
            }));

            if (notificationValues.length > 0) {
                await db.insert(notifications).values(notificationValues);
            }
        }

        return NextResponse.json({
            success: true,
            announcement: newAnnouncement,
            notificationsSent: published && sendNotificationFlag,
        });
    } catch (error: any) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Error creating announcement:', error);
        return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 });
    }
}

