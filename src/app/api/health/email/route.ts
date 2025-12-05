import { NextResponse } from 'next/server';
import { db } from '@/db';
import { siteSettings } from '@/db/schema';
import { eq, and, like } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health/email
 * Check if email/SMTP is configured
 */
export async function GET() {
    try {
        // Check if SMTP settings exist in site_settings
        const smtpSettings = await db
            .select()
            .from(siteSettings)
            .where(like(siteSettings.key, 'smtp_%'));

        const smtpHost = smtpSettings.find(s => s.key === 'smtp_host')?.value;
        const smtpPort = smtpSettings.find(s => s.key === 'smtp_port')?.value;
        const smtpUser = smtpSettings.find(s => s.key === 'smtp_user')?.value;

        // Check if core SMTP settings are present
        const configured = !!(smtpHost && smtpPort);

        return NextResponse.json({
            status: configured ? 'online' : 'degraded',
            configured,
            settings: {
                host: smtpHost ? '***configured***' : null,
                port: smtpPort || null,
                user: smtpUser ? '***configured***' : null,
            },
            message: configured ? 'Email service configured' : 'SMTP not configured',
        });
    } catch (error) {
        console.error('Email health check failed:', error);

        return NextResponse.json({
            status: 'offline',
            configured: false,
            message: 'Failed to check email configuration',
        });
    }
}
