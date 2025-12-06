import { NextResponse } from 'next/server';
import { db } from '@/db';
import { siteSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/settings/maintenance
 * Public endpoint to check maintenance mode status
 */
export async function GET() {
    try {
        const [maintenanceSetting] = await db
            .select()
            .from(siteSettings)
            .where(eq(siteSettings.key, 'maintenance_mode'));

        const [messageSetting] = await db
            .select()
            .from(siteSettings)
            .where(eq(siteSettings.key, 'maintenance_message'));

        return NextResponse.json({
            maintenanceMode: maintenanceSetting?.value === 'true',
            maintenanceMessage: messageSetting?.value || 'Under Maintenance, Expect possible downtimes.',
        });
    } catch (error) {
        console.error('Error checking maintenance mode:', error);
        // Default to not in maintenance mode if error
        return NextResponse.json({
            maintenanceMode: false,
            maintenanceMessage: '',
        });
    }
}

