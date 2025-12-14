import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { supportTickets, guestTicketTokens } from '@/db/schema';
import { eq, and, gt, desc } from 'drizzle-orm';
import crypto from 'crypto';
import { sendTicketAccessEmail } from '@/lib/email';

/**
 * POST /api/tickets/guest/resend
 * Resend access email for guest ticket
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Find most recent open ticket for this email
        const [ticket] = await db
            .select()
            .from(supportTickets)
            .where(
                and(
                    eq(supportTickets.guestEmail, email),
                    eq(supportTickets.status, 'open')
                )
            )
            .orderBy(desc(supportTickets.createdAt))
            .limit(1);

        if (!ticket) {
            // Don't reveal if ticket exists or not for security
            return NextResponse.json({
                success: true,
                message: 'If a ticket exists for this email, an access link has been sent.',
            });
        }

        // Generate new access token
        const accessToken = crypto.randomBytes(32).toString('hex');
        const tokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Update ticket with new token
        await db.update(supportTickets)
            .set({
                guestAccessToken: accessToken,
                guestAccessTokenExpires: tokenExpires,
            })
            .where(eq(supportTickets.id, ticket.id));

        // Create new token record
        await db.insert(guestTicketTokens).values({
            ticketId: ticket.id,
            email,
            token: accessToken,
            expiresAt: tokenExpires,
        });

        // Send email
        try {
            await sendTicketAccessEmail(email, ticket.guestName || 'Guest', ticket.id, accessToken);
        } catch (emailError) {
            console.error('Failed to send ticket access email:', emailError);
            return NextResponse.json(
                { error: 'Failed to send email. Please try again.' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'If a ticket exists for this email, an access link has been sent.',
        });
    } catch (error) {
        console.error('Error resending access email:', error);
        return NextResponse.json({ error: 'Failed to resend email' }, { status: 500 });
    }
}
