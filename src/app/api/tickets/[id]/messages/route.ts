import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import { db } from '@/db';
import { supportTickets, ticketMessages } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/tickets/[id]/messages
 * Add message to ticket
 */
export async function POST(
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

        // Parse user ID (session stores it as string)
        const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;

        if (isNaN(ticketId)) {
            return NextResponse.json({ error: 'Invalid ticket ID' }, { status: 400 });
        }

        // Get ticket
        const [ticket] = await db
            .select()
            .from(supportTickets)
            .where(eq(supportTickets.id, ticketId));

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        // Check permission - allow if userId matches OR discordUserId matches user's linked Discord
        const userDiscordId = user.discordId;
        const isOwner = ticket.userId === userId || (userDiscordId && ticket.discordUserId === userDiscordId);

        if (!isStaff && !isOwner) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Check if ticket is closed
        if (ticket.status === 'closed') {
            return NextResponse.json(
                { error: 'Cannot reply to a closed ticket' },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { message } = body;

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        // Add message
        const [newMessage] = await db.insert(ticketMessages).values({
            ticketId,
            userId,
            message,
            isStaffReply: isStaff,
        }).returning();

        // Update ticket status and timestamp
        const newStatus = isStaff ? 'waiting' : (ticket.status === 'waiting' ? 'open' : ticket.status);
        await db.update(supportTickets)
            .set({
                status: newStatus,
                updatedAt: new Date(),
            })
            .where(eq(supportTickets.id, ticketId));

        // Send message to Discord thread
        if (ticket.discordThreadId) {
            try {
                const { sendTicketMessage } = await import('@/lib/discord-integration');
                await sendTicketMessage(
                    ticket.discordThreadId,
                    message,
                    user.username,
                    isStaff
                );
            } catch (error) {
                console.error('Failed to send message to Discord thread:', error);
                // Continue even if Discord sync fails
            }
        }

        return NextResponse.json({ success: true, message: newMessage });
    } catch (error) {
        console.error('Error adding message:', error);
        return NextResponse.json({ error: 'Failed to add message' }, { status: 500 });
    }
}
