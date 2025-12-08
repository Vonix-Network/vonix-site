import { redirect } from 'next/navigation';
import { auth } from '../../../auth';
import { canAccessAdmin } from '@/lib/auth-guard';

export const metadata = {
    title: 'Server Panel | Vonix Network',
    description: 'Manage your Minecraft servers',
};

export default async function PanelLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session?.user) {
        redirect('/login?callbackUrl=/panel');
    }

    // Use the same permission check as admin panel
    const hasAccess = await canAccessAdmin();
    if (!hasAccess) {
        redirect('/login?callbackUrl=/panel&error=AccessDenied');
    }

    // Double-check for superadmin role
    if (session.user.role !== 'superadmin') {
        redirect('/');
    }

    return (
        <div className="min-h-screen bg-background">
            {children}
        </div>
    );
}
