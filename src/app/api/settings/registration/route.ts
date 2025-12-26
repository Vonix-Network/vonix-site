import { NextResponse } from 'next/server';
import { db } from '@/db';
import { siteSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/settings/registration
 * Public endpoint to check registration settings
 */
export async function GET() {
    try {
        const [registrationEnabled] = await db
            .select()
            .from(siteSettings)
            .where(eq(siteSettings.key, 'registration_enabled'));

        const [requireCode] = await db
            .select()
            .from(siteSettings)
            .where(eq(siteSettings.key, 'require_registration_code'));

        return NextResponse.json({
            registrationEnabled: registrationEnabled?.value !== 'false',
            requireRegistrationCode: requireCode?.value !== 'false',
        });
    } catch (error: any) {
        console.error('Error checking registration settings:', error);
        // Default to requiring registration code if error
        return NextResponse.json({
            registrationEnabled: true,
            requireRegistrationCode: true,
        });
    }
}
