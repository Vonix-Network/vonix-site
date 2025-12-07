import { redirect } from 'next/navigation';
import { auth } from '../../../../../auth';
import PterodactylSettingsClient from './pterodactyl-client';

export default async function PterodactylSettingsPage() {
    const session = await auth();
    const user = session?.user as any;

    // Only superadmins can access Pterodactyl settings
    if (user?.role !== 'superadmin') {
        redirect('/admin?error=SuperadminOnly');
    }

    return <PterodactylSettingsClient />;
}
