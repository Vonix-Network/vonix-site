import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { siteSettings } from '@/db/schema';
import { eq, like } from 'drizzle-orm';
import nodemailer from 'nodemailer';

/**
 * POST /api/admin/email/test
 * Send a test email to verify SMTP configuration
 */
export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { success: false, error: 'Email address required' },
                { status: 400 }
            );
        }

        // Get SMTP settings from database
        const smtpSettings = await db
            .select()
            .from(siteSettings)
            .where(like(siteSettings.key, 'smtp_%'));

        const getValue = (key: string) =>
            smtpSettings.find(s => s.key === key)?.value || '';

        const smtpHost = getValue('smtp_host');
        const smtpPort = parseInt(getValue('smtp_port')) || 587;
        const smtpUser = getValue('smtp_user');
        const smtpPassword = getValue('smtp_password');
        const smtpFromEmail = getValue('smtp_from_email') || smtpUser;
        const smtpFromName = getValue('smtp_from_name') || 'Vonix Network';
        const smtpSecure = getValue('smtp_secure') === 'true';

        if (!smtpHost || !smtpUser || !smtpPassword) {
            return NextResponse.json(
                { success: false, error: 'SMTP not fully configured. Please set host, user, and password.' },
                { status: 400 }
            );
        }

        // Create transporter
        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpSecure || smtpPort === 465,
            auth: {
                user: smtpUser,
                pass: smtpPassword,
            },
        });

        // Send test email
        await transporter.sendMail({
            from: `"${smtpFromName}" <${smtpFromEmail}>`,
            to: email,
            subject: '✅ Vonix Network - Test Email',
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 40px auto; background: rgba(26, 26, 46, 0.9); border-radius: 16px; border: 1px solid rgba(0, 255, 255, 0.2); overflow: hidden;">
            <tr>
              <td style="padding: 40px; text-align: center;">
                <h1 style="color: #00ffff; font-size: 28px; margin: 0 0 10px 0; font-weight: 700;">
                  ✅ Test Successful!
                </h1>
                <p style="color: #a0a0a0; font-size: 16px; margin: 0;">
                  Your SMTP configuration is working correctly.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 40px 40px 40px;">
                <div style="background: rgba(0, 255, 255, 0.1); border: 1px solid rgba(0, 255, 255, 0.3); border-radius: 12px; padding: 24px;">
                  <h2 style="color: #ffffff; font-size: 18px; margin: 0 0 16px 0;">
                    SMTP Configuration
                  </h2>
                  <table style="width: 100%; color: #a0a0a0; font-size: 14px;">
                    <tr>
                      <td style="padding: 4px 0;">Host:</td>
                      <td style="padding: 4px 0; text-align: right; color: #00ffff;">${smtpHost}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0;">Port:</td>
                      <td style="padding: 4px 0; text-align: right; color: #00ffff;">${smtpPort}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0;">Secure:</td>
                      <td style="padding: 4px 0; text-align: right; color: #00ffff;">${smtpSecure ? 'Yes (TLS/SSL)' : 'No'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0;">From:</td>
                      <td style="padding: 4px 0; text-align: right; color: #00ffff;">${smtpFromName}</td>
                    </tr>
                  </table>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 40px 40px 40px; text-align: center;">
                <p style="color: #666; font-size: 12px; margin: 0;">
                  This is a test email from Vonix Network.<br>
                  Sent at: ${new Date().toLocaleString()}
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
        });

        return NextResponse.json({
            success: true,
            message: 'Test email sent successfully',
        });

    } catch (error) {
        console.error('Test email error:', error);

        const errorMessage = error instanceof Error
            ? error.message
            : 'Unknown error occurred';

        return NextResponse.json(
            { success: false, error: `Failed to send email: ${errorMessage}` },
            { status: 500 }
        );
    }
}
