import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { supportTickets, ticketMessages } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';

/**
 * POST /api/tickets/guest/[id]/messages
 * Add message to guest ticket
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const ticketId = parseInt(id);
        const body = await request.json();
        const { message, token } = body;

        if (!token) {
            return NextResponse.json({ error: 'Access token required' }, { status: 401 });
        }

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        if (isNaN(ticketId)) {
            return NextResponse.json({ error: 'Invalid ticket ID' }, { status: 400 });
        }

        // Verify token and get ticket
        const [ticket] = await db
            .select()
            .from(supportTickets)
            .where(
                and(
                    eq(supportTickets.id, ticketId),
                    eq(supportTickets.guestAccessToken, token),
                    gt(supportTickets.guestAccessTokenExpires, new Date())
                )
            );

        if (!ticket) {
            return NextResponse.json(
                { error: 'Invalid or expired access token' },
                { status: 403 }
            );
        }

        // Check if ticket is closed
        if (ticket.status === 'closed') {
            return NextResponse.json(
                { error: 'Cannot reply to a closed ticket' },
                { status: 400 }
            );
        }

        // Add message
        const [newMessage] = await db.insert(ticketMessages).values({
            ticketId,
            userId: null,
            guestName: ticket.guestName,
            message,
            isStaffReply: false,
        }).returning();

        // Update ticket status and timestamp
        const newStatus = ticket.status === 'waiting' ? 'open' : ticket.status;
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
                    `${ticket.guestName} (Guest)`,
                    false
                );
            } catch (error) {
                console.error('Failed to send message to Discord thread:', error);
            }
        }

        return NextResponse.json({
            success: true,
            message: {
                id: newMessage.id,
                message: newMessage.message,
                guestName: newMessage.guestName,
                isStaffReply: newMessage.isStaffReply,
                createdAt: newMessage.createdAt,
            },
        });
    } catch (error) {
        console.error('Error adding guest message:', error);
        return NextResponse.json({ error: 'Failed to add message' }, { status: 500 });
    }
}
