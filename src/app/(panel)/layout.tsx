import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const metadata = {
    title: 'Server Panel | Vonix Network',
    description: 'Manage your Minecraft servers',
};

export default async function PanelLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect('/login?callbackUrl=/panel');
    }

    // Check if user has permission to access panel
    if (session.user.role !== 'superadmin') {
        redirect('/');
    }

    return (
        <div className="min-h-screen bg-background">
            {children}
        </div>
    );
}
