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

        // Filter by user if not staff
        const tickets = isStaff
            ? await query
            : await db
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
                .where(eq(supportTickets.userId, user.id))
                .orderBy(desc(supportTickets.updatedAt))
                .limit(limit);

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

        // Create ticket
        const [ticket] = await db.insert(supportTickets).values({
            userId: user.id,
            subject,
            category: category || 'general',
            priority: priority || 'normal',
            status: 'open',
        }).returning();

        // Create first message
        await db.insert(ticketMessages).values({
            ticketId: ticket.id,
            userId: user.id,
            message,
            isStaffReply: false,
        });

        return NextResponse.json({ success: true, ticket });
    } catch (error) {
        console.error('Error creating ticket:', error);
        return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
    }
}
