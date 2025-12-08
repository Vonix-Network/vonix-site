import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PanelClient } from './panel-client';

export const metadata = {
    title: 'Server Panel | Vonix Network',
    description: 'Manage your Minecraft servers with real-time console, file management, and more',
};

export default async function PanelPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect('/login?callbackUrl=/panel');
    }

    if (session.user.role !== 'superadmin') {
        redirect('/');
    }

    return <PanelClient />;
}
