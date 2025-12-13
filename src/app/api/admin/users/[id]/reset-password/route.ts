import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../../auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

/**
 * Require admin role
 */
async function requireAdmin() {
    const session = await auth();
    const user = session?.user as any;

    if (!session || !['admin', 'superadmin'].includes(user?.role)) {
        throw new Error('Unauthorized');
    }

    return user;
}

/**
 * Generate a secure random password
 */
function generatePassword(length: number = 16): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    const bytes = randomBytes(length);
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset[bytes[i] % charset.length];
    }
    return password;
}

/**
 * POST /api/admin/users/[id]/reset-password
 * Reset a user's password (admin only)
 * 
 * Body options:
 * - { generatePassword: true } - Generate a random password and return it
 * - { newPassword: "..." } - Set a specific password
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await requireAdmin();
        const { id } = await params;
        const userId = parseInt(id);

        if (isNaN(userId)) {
            return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
        }

        const body = await request.json();
        const { generatePassword: shouldGenerate, newPassword } = body;

        // Get target user
        const [targetUser] = await db
            .select()
            .from(users)
            .where(eq(users.id, userId));

        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Prevent non-superadmins from changing superadmin passwords
        if (targetUser.role === 'superadmin' && admin.role !== 'superadmin') {
            return NextResponse.json(
                { error: 'Only superadmins can reset superadmin passwords' },
                { status: 403 }
            );
        }

        // Determine the new password
        let plainPassword: string;
        if (shouldGenerate) {
            plainPassword = generatePassword(16);
        } else if (newPassword) {
            if (newPassword.length < 8) {
                return NextResponse.json(
                    { error: 'Password must be at least 8 characters' },
                    { status: 400 }
                );
            }
            plainPassword = newPassword;
        } else {
            return NextResponse.json(
                { error: 'Must provide newPassword or set generatePassword: true' },
                { status: 400 }
            );
        }

        // Hash and update
        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        await db
            .update(users)
            .set({
                password: hashedPassword,
                updatedAt: new Date(),
            })
            .where(eq(users.id, userId));

        console.log(`Admin ${admin.username} reset password for user ${targetUser.username} (ID: ${userId})`);

        // Return the generated password if it was generated (so admin can share it)
        if (shouldGenerate) {
            return NextResponse.json({
                success: true,
                message: 'Password has been reset',
                generatedPassword: plainPassword,
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Password has been reset',
        });
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }
        console.error('Error resetting user password:', error);
        return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
    }
}
