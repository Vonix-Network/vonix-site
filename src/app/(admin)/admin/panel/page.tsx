import { redirect } from 'next/navigation';
import { auth } from '../../../../../auth';
import ServerPanelClient from './panel-client';

export default async function ServerPanelPage() {
    const session = await auth();
    const user = session?.user as any;

    // Only superadmins can access the Server Panel
    if (user?.role !== 'superadmin') {
        redirect('/admin?error=SuperadminOnly');
    }

    return <ServerPanelClient />;
}
