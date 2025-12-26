import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { supportTickets, ticketMessages, guestTicketTokens, ticketCategories } from '@/db/schema';
import { desc, eq, and, gt, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { sendTicketAccessEmail } from '@/lib/email';
import { sanitizeEmail, sanitizeForDb, sanitizeContent, sanitizeEnum } from '@/lib/sanitize';

/**
 * POST /api/tickets/guest
 * Create a guest ticket (no authentication required)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Sanitize inputs
        const email = sanitizeEmail(body.email);
        const name = sanitizeForDb(body.name, 100, false);
        const subject = sanitizeForDb(body.subject, 200, false);
        const message = sanitizeContent(body.message, 5000);
        const category = sanitizeEnum(body.category, ['account', 'billing', 'technical', 'general', 'other'] as const, 'general');
        const priority = sanitizeEnum(body.priority, ['low', 'normal', 'high', 'urgent'] as const, 'normal');
        const categoryId = body.categoryId;

        // Validate required fields
        if (!email || !name || !subject || !message) {
            return NextResponse.json(
                { error: 'Email, name, subject, and message are required' },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Invalid email address' },
                { status: 400 }
            );
        }

        // Generate access token
        const accessToken = crypto.randomBytes(32).toString('hex');
        const tokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Get next ticket number
        const result = await db.select({ maxNum: sql<number>`COALESCE(MAX(number), 0)` }).from(supportTickets);
        const ticketNumber = (result[0]?.maxNum || 0) + 1;

        // Create ticket
        const [ticket] = await db.insert(supportTickets).values({
            number: ticketNumber,
            userId: null, // Guest ticket
            categoryId: categoryId || null,
            subject,
            category,
            priority,
            status: 'open',
            guestEmail: email,
            guestName: name,
            guestAccessToken: accessToken,
            guestAccessTokenExpires: tokenExpires,
        }).returning();

        // Create first message
        await db.insert(ticketMessages).values({
            ticketId: ticket.id,
            userId: null,
            guestName: name,
            message,
            isStaffReply: false,
        });

        // Create access token record
        await db.insert(guestTicketTokens).values({
            ticketId: ticket.id,
            email,
            token: accessToken,
            expiresAt: tokenExpires,
        });

        // Send email with access link
        try {
            await sendTicketAccessEmail(email, name, ticket.id, accessToken);
        } catch (emailError) {
            console.error('Failed to send ticket access email:', emailError);
            // Continue even if email fails - they can still access via token
        }

        // Create Discord thread for ticket if configured
        try {
            const { createTicketThread } = await import('@/lib/discord-integration');
            const threadId = await createTicketThread(
                ticket.id,
                subject,
                `${name} (Guest)`,
                category,
                priority
            );

            if (threadId) {
                await db.update(supportTickets)
                    .set({ discordThreadId: threadId })
                    .where(eq(supportTickets.id, ticket.id));
            }
        } catch (error: any) {
            console.error('Failed to create Discord thread for guest ticket:', error);
        }

        return NextResponse.json({
            success: true,
            ticket: {
                id: ticket.id,
                subject: ticket.subject,
            },
            message: 'Ticket created! Check your email for the access link.',
        });
    } catch (error: any) {
        console.error('Error creating guest ticket:', error);
        return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
    }
}

/**
 * GET /api/tickets/guest?token=xxx
 * Get guest ticket by access token
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.json({ error: 'Access token required' }, { status: 400 });
        }

        // Find ticket by access token
        const [ticket] = await db
            .select()
            .from(supportTickets)
            .where(
                and(
                    eq(supportTickets.guestAccessToken, token),
                    gt(supportTickets.guestAccessTokenExpires, new Date())
                )
            );

        if (!ticket) {
            return NextResponse.json(
                { error: 'Invalid or expired access token' },
                { status: 404 }
            );
        }

        // Get messages
        const messages = await db
            .select()
            .from(ticketMessages)
            .where(eq(ticketMessages.ticketId, ticket.id))
            .orderBy(ticketMessages.createdAt);

        return NextResponse.json({
            ticket: {
                id: ticket.id,
                subject: ticket.subject,
                category: ticket.category,
                priority: ticket.priority,
                status: ticket.status,
                guestName: ticket.guestName,
                guestEmail: ticket.guestEmail,
                createdAt: ticket.createdAt,
                updatedAt: ticket.updatedAt,
                closedAt: ticket.closedAt,
            },
            messages: messages.map(msg => ({
                id: msg.id,
                message: msg.message,
                isStaffReply: msg.isStaffReply,
                guestName: msg.guestName,
                createdAt: msg.createdAt,
            })),
        });
    } catch (error: any) {
        console.error('Error fetching guest ticket:', error);
        return NextResponse.json({ error: 'Failed to fetch ticket' }, { status: 500 });
    }
}
