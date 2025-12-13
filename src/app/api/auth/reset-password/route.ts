import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, passwordResetTokens } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

/**
 * POST /api/auth/reset-password
 * Reset password using a token
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { token, newPassword } = body;

        if (!token || !newPassword) {
            return NextResponse.json(
                { error: 'Token and new password are required' },
                { status: 400 }
            );
        }

        if (newPassword.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters' },
                { status: 400 }
            );
        }

        // Find valid token
        const [resetToken] = await db
            .select()
            .from(passwordResetTokens)
            .where(
                and(
                    eq(passwordResetTokens.token, token),
                    gt(passwordResetTokens.expiresAt, new Date())
                )
            );

        if (!resetToken) {
            return NextResponse.json(
                { error: 'Invalid or expired reset link. Please request a new one.' },
                { status: 400 }
            );
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user password
        await db
            .update(users)
            .set({
                password: hashedPassword,
                updatedAt: new Date(),
            })
            .where(eq(users.id, resetToken.userId));

        // Delete the used token
        await db
            .delete(passwordResetTokens)
            .where(eq(passwordResetTokens.id, resetToken.id));

        console.log(`Password reset completed for user ID: ${resetToken.userId}`);

        return NextResponse.json({
            success: true,
            message: 'Password has been reset successfully. You can now log in.',
        });
    } catch (error) {
        console.error('Error resetting password:', error);
        return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
    }
}
