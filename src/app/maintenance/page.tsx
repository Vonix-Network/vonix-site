import { MaintenancePage } from '@/components/maintenance-page';
import { db } from '@/db';
import { siteSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

async function getMaintenanceMessage() {
    try {
        const [messageSetting] = await db
            .select()
            .from(siteSettings)
            .where(eq(siteSettings.key, 'maintenance_message'));

        return messageSetting?.value || 'Under Maintenance, Expect possible downtimes.';
    } catch {
        return 'Under Maintenance, Expect possible downtimes.';
    }
}

export default async function MaintenanceRoute() {
    const message = await getMaintenanceMessage();

    return <MaintenancePage message={message} />;
}

