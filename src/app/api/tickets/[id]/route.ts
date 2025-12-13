import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/db';
import { supportTickets, ticketMessages, users } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

/**
 * GET /api/tickets/[id]
 * Get ticket with messages
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;
        const isStaff = ['admin', 'superadmin', 'moderator'].includes(user.role);
        const { id } = await params;
        const ticketId = parseInt(id);

        if (isNaN(ticketId)) {
            return NextResponse.json({ error: 'Invalid ticket ID' }, { status: 400 });
        }

        // Get ticket with creator info
        const [ticket] = await db
            .select({
                id: supportTickets.id,
                subject: supportTickets.subject,
                category: supportTickets.category,
                priority: supportTickets.priority,
                status: supportTickets.status,
                createdAt: supportTickets.createdAt,
                updatedAt: supportTickets.updatedAt,
                closedAt: supportTickets.closedAt,
                userId: supportTickets.userId,
                username: users.username,
                assignedTo: supportTickets.assignedTo,
            })
            .from(supportTickets)
            .leftJoin(users, eq(supportTickets.userId, users.id))
            .where(eq(supportTickets.id, ticketId));

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        // Check permission
        if (!isStaff && ticket.userId !== user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Get messages
        const messages = await db
            .select({
                id: ticketMessages.id,
                message: ticketMessages.message,
                isStaffReply: ticketMessages.isStaffReply,
                createdAt: ticketMessages.createdAt,
                userId: ticketMessages.userId,
                username: users.username,
                userRole: users.role,
            })
            .from(ticketMessages)
            .leftJoin(users, eq(ticketMessages.userId, users.id))
            .where(eq(ticketMessages.ticketId, ticketId))
            .orderBy(asc(ticketMessages.createdAt));

        return NextResponse.json({ ticket, messages, isStaff });
    } catch (error) {
        console.error('Error fetching ticket:', error);
        return NextResponse.json({ error: 'Failed to fetch ticket' }, { status: 500 });
    }
}

/**
 * PUT /api/tickets/[id]
 * Update ticket (status, priority, assignee) - staff only
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;
        const isStaff = ['admin', 'superadmin', 'moderator'].includes(user.role);

        if (!isStaff) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;
        const ticketId = parseInt(id);
        const body = await request.json();
        const { status, priority, assignedTo } = body;

        const updateData: any = { updatedAt: new Date() };
        if (status) updateData.status = status;
        if (priority) updateData.priority = priority;
        if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
        if (status === 'closed' || status === 'resolved') {
            updateData.closedAt = new Date();
        }

        await db.update(supportTickets)
            .set(updateData)
            .where(eq(supportTickets.id, ticketId));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating ticket:', error);
        return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
    }
}
