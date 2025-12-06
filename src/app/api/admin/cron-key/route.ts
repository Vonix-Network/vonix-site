import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/db';
import { siteSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';

/**
 * GET /api/admin/cron-key
 * Returns the cron secret key (generates one if doesn't exist)
 * Only accessible by admin/superadmin
 */
export async function GET() {
    try {
        const session = await auth();
        const user = session?.user as any;

        if (!session || !['admin', 'superadmin'].includes(user?.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if cron key exists in database
        const [existingKey] = await db
            .select()
            .from(siteSettings)
            .where(eq(siteSettings.key, 'cron_secret'));

        if (existingKey?.value) {
            return NextResponse.json({
                configured: true,
                key: existingKey.value,
                createdAt: existingKey.updatedAt,
            });
        }

        // Generate a new key if none exists
        const newKey = generateCronKey();

        await db.insert(siteSettings).values({
            key: 'cron_secret',
            value: newKey,
            category: 'security',
            description: 'Secret key for authenticating cron job requests',
            isPublic: false,
        });

        return NextResponse.json({
            configured: true,
            key: newKey,
            createdAt: new Date(),
            isNew: true,
        });
    } catch (error) {
        console.error('Error fetching cron key:', error);
        return NextResponse.json({ error: 'Failed to fetch cron key' }, { status: 500 });
    }
}

/**
 * POST /api/admin/cron-key
 * Regenerate the cron secret key
 */
export async function POST() {
    try {
        const session = await auth();
        const user = session?.user as any;

        if (!session || !['admin', 'superadmin'].includes(user?.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const newKey = generateCronKey();

        // Check if key exists
        const [existingKey] = await db
            .select()
            .from(siteSettings)
            .where(eq(siteSettings.key, 'cron_secret'));

        if (existingKey) {
            // Update existing key
            await db
                .update(siteSettings)
                .set({
                    value: newKey,
                    updatedAt: new Date(),
                })
                .where(eq(siteSettings.key, 'cron_secret'));
        } else {
            // Create new key
            await db.insert(siteSettings).values({
                key: 'cron_secret',
                value: newKey,
                category: 'security',
                description: 'Secret key for authenticating cron job requests',
                isPublic: false,
            });
        }

        return NextResponse.json({
            success: true,
            key: newKey,
            message: 'Cron key regenerated successfully. Update your cron jobs with the new key.',
        });
    } catch (error) {
        console.error('Error regenerating cron key:', error);
        return NextResponse.json({ error: 'Failed to regenerate cron key' }, { status: 500 });
    }
}

function generateCronKey(): string {
    // Generate a URL-safe random key (no special characters that need encoding)
    return randomBytes(32)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

