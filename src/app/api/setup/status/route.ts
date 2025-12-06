import { NextResponse } from 'next/server';
import { db } from '@/db';
import { siteSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/setup/status
 * Check if initial setup has been completed
 * Uses siteSettings table with key 'setup_completed'
 */
export async function GET() {
  try {
    const [setupSetting] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, 'setup_completed'))
      .limit(1);

    const [versionSetting] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, 'setup_version'))
      .limit(1);

    return NextResponse.json({
      isCompleted: setupSetting?.value === 'true',
      completedAt: setupSetting?.updatedAt || null,
      version: versionSetting?.value || '4.0.0',
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

