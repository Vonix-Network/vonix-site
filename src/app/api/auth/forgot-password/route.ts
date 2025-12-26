import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, passwordResetTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { sendEmail } from '@/lib/email';

/**
 * POST /api/auth/forgot-password
 * Request a password reset email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));

    // Always return success to prevent email enumeration
    if (!user || !user.email) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // Generate reset token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token in database (delete any existing tokens for this user first)
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token,
      expiresAt,
      createdAt: new Date(),
    });

    // Build reset URL
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://vonix.network';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    // Build email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 40px auto; background: rgba(26, 26, 46, 0.9); border-radius: 16px; border: 1px solid rgba(0, 255, 255, 0.2); overflow: hidden;">
    <tr>
      <td style="padding: 30px 40px; text-align: center; background: linear-gradient(135deg, rgba(0, 255, 255, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%); border-bottom: 1px solid rgba(0, 255, 255, 0.2);">
        <h1 style="color: #00ffff; font-size: 24px; margin: 0; font-weight: 700;">Vonix Network</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px;">
        <h2 style="color: #00D9FF; margin-bottom: 20px;">Password Reset Request</h2>
        <p style="color: #fff; font-size: 16px; line-height: 1.6;">Hi <strong>${user.username}</strong>,</p>
        <p style="color: #b3b3b3; font-size: 14px; line-height: 1.6;">We received a request to reset your password. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #00D9FF, #8B5CF6); color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Reset Password</a>
        </div>
        <p style="color: #b3b3b3; font-size: 13px; line-height: 1.6;">This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">If the button doesn't work, copy and paste this link:<br/><span style="color: #00D9FF;">${resetUrl}</span></p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 40px; text-align: center; border-top: 1px solid rgba(255,255,255,0.1);">
        <p style="color: #666; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Vonix Network. All rights reserved.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const emailSent = await sendEmail(user.email, {
      subject: 'Reset Your Vonix Network Password',
      html: emailHtml,
      text: `Hi ${user.username}, visit this link to reset your password: ${resetUrl}. This link expires in 1 hour.`,
    });

    if (!emailSent) {
      console.error('Failed to send password reset email');
      // Still return success to prevent enumeration
    }

    console.log(`Password reset email sent to: ${email} (user: ${user.username})`);

    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error: any) {
    console.error('Error in forgot password:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
