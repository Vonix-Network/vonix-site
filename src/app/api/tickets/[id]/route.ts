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

        // Parse user ID (session stores it as string)
        const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;

        if (isNaN(ticketId)) {
            return NextResponse.json({ error: 'Invalid ticket ID' }, { status: 400 });
        }

        // Get ticket with creator info
        const [ticketRaw] = await db
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
                linkedUsername: users.username,
                discordUsername: supportTickets.discordUsername,
                discordUserId: supportTickets.discordUserId,
                assignedTo: supportTickets.assignedTo,
                discordThreadId: supportTickets.discordThreadId,
            })
            .from(supportTickets)
            .leftJoin(users, eq(supportTickets.userId, users.id))
            .where(eq(supportTickets.id, ticketId));

        // Resolve username: prefer linked user, fallback to discordUsername
        const ticket = ticketRaw ? {
            ...ticketRaw,
            username: ticketRaw.linkedUsername || ticketRaw.discordUsername || 'Unknown',
        } : null;

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        // Check permission - allow if userId matches OR discordUserId matches user's linked Discord
        const userDiscordId = user.discordId;
        const isOwner = ticket.userId === userId || (userDiscordId && ticket.discordUserId === userDiscordId);

        if (!isStaff && !isOwner) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Get messages
        const rawMessages = await db
            .select({
                id: ticketMessages.id,
                message: ticketMessages.message,
                isStaffReply: ticketMessages.isStaffReply,
                createdAt: ticketMessages.createdAt,
                userId: ticketMessages.userId,
                linkedUsername: users.username,
                linkedMinecraftUsername: users.minecraftUsername,
                linkedAvatar: users.avatar,
                linkedDiscordAvatar: users.discordAvatar,
                linkedDiscordId: users.discordId,
                userRole: users.role,
                discordUserId: ticketMessages.discordUserId,
                discordUsername: ticketMessages.discordUsername,
                discordAvatar: ticketMessages.discordAvatar,
                guestName: ticketMessages.guestName,
            })
            .from(ticketMessages)
            .leftJoin(users, eq(ticketMessages.userId, users.id))
            .where(eq(ticketMessages.ticketId, ticketId))
            .orderBy(asc(ticketMessages.createdAt));

        // Helper to construct Discord avatar URL
        const getDiscordAvatarUrl = (userId: string | null, avatar: string | null) => {
            if (!avatar) return null;
            // If we already stored a full URL (recommended), use it directly
            if (avatar.startsWith('http://') || avatar.startsWith('https://')) return avatar;
            // Otherwise assume it's an avatar hash
            if (!userId) return null;
            return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png`;
        };

        const getMinecraftAvatarUrl = (name: string | null) => {
            if (!name) return null;
            return `https://minotar.net/armor/bust/${encodeURIComponent(name)}/64.png`;
        };

        // Resolve username and avatar: prefer linked user, then discord, then guest
        const messages = rawMessages.map(msg => {
            // Resolve avatar URL
            let avatarUrl: string | null = null;
            if (msg.linkedAvatar) {
                avatarUrl = msg.linkedAvatar;
            } else if (msg.linkedDiscordId && msg.linkedDiscordAvatar) {
                avatarUrl = getDiscordAvatarUrl(msg.linkedDiscordId, msg.linkedDiscordAvatar);
            } else if (msg.discordUserId && msg.discordAvatar) {
                avatarUrl = getDiscordAvatarUrl(msg.discordUserId, msg.discordAvatar);
            } else {
                // Fallback for site users (including staff) if they haven't set a custom avatar
                avatarUrl = getMinecraftAvatarUrl(msg.linkedMinecraftUsername || msg.linkedUsername);
            }

            // Debug logging for avatar resolution (temporary)
            console.log(`[TicketAPI] Msg #${msg.id} User: ${msg.linkedUsername || msg.discordUsername} AvatarUrl: ${avatarUrl} (LinkedAvatar: ${msg.linkedAvatar}, DiscordAvatar: ${msg.discordAvatar})`);

            return {
                id: msg.id,
                message: msg.message,
                isStaffReply: msg.isStaffReply,
                createdAt: msg.createdAt,
                username: msg.linkedUsername || msg.discordUsername || msg.guestName || 'Unknown',
                userRole: msg.userRole,
                avatarUrl,
            };
        });

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

        const [updatedTicket] = await db.update(supportTickets)
            .set(updateData)
            .where(eq(supportTickets.id, ticketId))
            .returning();

        // Close Discord thread if ticket is closed/resolved
        if ((status === 'closed' || status === 'resolved') && updatedTicket?.discordThreadId) {
            try {
                const { closeTicketThread } = await import('@/lib/discord-integration');
                await closeTicketThread(updatedTicket.discordThreadId);
            } catch (error) {
                console.error('Failed to close Discord thread:', error);
                // Continue even if Discord sync fails
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating ticket:', error);
        return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
    }
}
