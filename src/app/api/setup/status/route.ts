import { NextResponse } from 'next/server';
import { db } from '@/db';
import { siteSettings, users } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * GET /api/setup/status
 * Check if initial setup has been completed
 * Uses siteSettings table with key 'setup_completed'
 * 
 * For existing installations that don't have the setup_completed key,
 * we check if there are admin users - if so, auto-mark as completed.
 */
export async function GET() {
  try {
    const [setupSetting] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, 'setup_completed'))
      .limit(1);

    // If setup_completed exists and is true, return that
    if (setupSetting?.value === 'true') {
      const [versionSetting] = await db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.key, 'setup_version'))
        .limit(1);

      return NextResponse.json({
        isCompleted: true,
        completedAt: setupSetting?.updatedAt || null,
        version: versionSetting?.value || '4.0.0',
      });
    }

    // For existing installations: check if there are any admin users
    // If so, this is an existing site and we should auto-mark setup as complete
    const [adminCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, 'superadmin'));

    if (adminCount && adminCount.count > 0) {
      // Auto-create the setup_completed setting for existing installations
      await db.insert(siteSettings).values({
        key: 'setup_completed',
        value: 'true',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: siteSettings.key,
        set: { value: 'true', updatedAt: new Date() },
      });

      await db.insert(siteSettings).values({
        key: 'setup_version',
        value: '4.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: siteSettings.key,
        set: { value: '4.0.0', updatedAt: new Date() },
      });

      console.log('Auto-marked setup as complete for existing installation');

      return NextResponse.json({
        isCompleted: true,
        completedAt: new Date(),
        version: '4.0.0',
      });
    }

    return NextResponse.json({
      isCompleted: false,
      completedAt: null,
      version: '4.0.0',
    });
  } catch (error) {
    // If error occurs (e.g., table doesn't exist), assume setup not completed
    console.error('Error checking setup status:', error);
    return NextResponse.json({
      isCompleted: false,
      completedAt: null,
      version: '4.0.0',
    });
  }
}
