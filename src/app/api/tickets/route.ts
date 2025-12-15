import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { db } from '@/db';
import { supportTickets, ticketMessages, users } from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';

/**
 * GET /api/tickets
 * List tickets - users see their own, admins see all
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;
        const isStaff = ['admin', 'superadmin', 'moderator'].includes(user.role);
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

        // Build base query
        let query = db
            .select({
                id: supportTickets.id,
                subject: supportTickets.subject,
                category: supportTickets.category,
                priority: supportTickets.priority,
                status: supportTickets.status,
                createdAt: supportTickets.createdAt,
                updatedAt: supportTickets.updatedAt,
                userId: supportTickets.userId,
                username: users.username,
                assignedTo: supportTickets.assignedTo,
            })
            .from(supportTickets)
            .leftJoin(users, eq(supportTickets.userId, users.id))
            .orderBy(desc(supportTickets.updatedAt))
            .limit(limit);

        // Parse user ID (session stores it as string)
        const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;

        // Get user's Discord ID for matching Discord-created tickets
        const userDiscordId = user.discordId;

        // Filter by user if not staff
        // Include tickets where:
        // 1. userId matches (created on website)
        // 2. discordUserId matches (created on Discord)
        let tickets;
        if (isStaff) {
            tickets = await query;
        } else {
            // Build OR condition for userId OR discordUserId
            const conditions = [eq(supportTickets.userId, userId)];
            if (userDiscordId) {
                conditions.push(eq(supportTickets.discordUserId, userDiscordId));
            }

            tickets = await db
                .select({
                    id: supportTickets.id,
                    subject: supportTickets.subject,
                    category: supportTickets.category,
                    priority: supportTickets.priority,
                    status: supportTickets.status,
                    createdAt: supportTickets.createdAt,
                    updatedAt: supportTickets.updatedAt,
                    userId: supportTickets.userId,
                    username: users.username,
                    assignedTo: supportTickets.assignedTo,
                    discordUserId: supportTickets.discordUserId,
                    discordUsername: supportTickets.discordUsername,
                    discordChannelId: supportTickets.discordChannelId,
                })
                .from(supportTickets)
                .leftJoin(users, eq(supportTickets.userId, users.id))
                .where(sql`${supportTickets.userId} = ${userId}${userDiscordId ? sql` OR ${supportTickets.discordUserId} = ${userDiscordId}` : sql``}`)
                .orderBy(desc(supportTickets.updatedAt))
                .limit(limit);
        }

        // Get counts for staff
        let counts = null;
        if (isStaff) {
            const [openCount] = await db
                .select({ count: sql<number>`count(*)` })
                .from(supportTickets)
                .where(eq(supportTickets.status, 'open'));
            const [inProgressCount] = await db
                .select({ count: sql<number>`count(*)` })
                .from(supportTickets)
                .where(eq(supportTickets.status, 'in_progress'));
            const [totalCount] = await db
                .select({ count: sql<number>`count(*)` })
                .from(supportTickets);

            counts = {
                open: openCount?.count || 0,
                inProgress: inProgressCount?.count || 0,
                total: totalCount?.count || 0,
            };
        }

        return NextResponse.json({ tickets, counts, isStaff });
    } catch (error) {
        console.error('Error fetching tickets:', error);
        return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
    }
}

/**
 * POST /api/tickets
 * Create a new ticket
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;
        const body = await request.json();
        const { subject, category, priority, message } = body;

        if (!subject || !message) {
            return NextResponse.json(
                { error: 'Subject and message are required' },
                { status: 400 }
            );
        }

        // Parse user ID (session stores it as string)
        const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
        if (isNaN(userId)) {
            return NextResponse.json({ error: 'Invalid user session' }, { status: 400 });
        }

        // Get next ticket number
        const result = await db.select({ maxNum: sql<number>`COALESCE(MAX(number), 0)` }).from(supportTickets);
        const ticketNumber = (result[0]?.maxNum || 0) + 1;

        // Create ticket
        const [ticket] = await db.insert(supportTickets).values({
            number: ticketNumber,
            userId,
            subject,
            category: category || 'general',
            priority: priority || 'normal',
            status: 'open',
        }).returning();

        // Create first message
        await db.insert(ticketMessages).values({
            ticketId: ticket.id,
            userId,
            message,
            isStaffReply: false,
        });

        // Create Discord thread for ticket
        try {
            const { createTicketThread } = await import('@/lib/discord-integration');
            const threadId = await createTicketThread(
                ticket.id,
                subject,
                user.username,
                category || 'general',
                priority || 'normal'
            );

            if (threadId) {
                // Update ticket with Discord thread ID
                await db.update(supportTickets)
                    .set({ discordThreadId: threadId })
                    .where(eq(supportTickets.id, ticket.id));

                console.log(`✅ Created Discord thread ${threadId} for ticket #${ticket.id}`);
            }
        } catch (error) {
            console.error('Failed to create Discord thread for ticket:', error);
            // Continue even if Discord thread creation fails
        }

        return NextResponse.json({ success: true, ticket });
    } catch (error) {
        console.error('Error creating ticket:', error);
        return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
    }
}
