import { redirect } from 'next/navigation';
import { auth } from '../../../auth';
import { canAccessAdmin } from '@/lib/auth-guard';
import { AdminLayoutClient } from './admin-layout-client';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use centralized auth guard
  const hasAccess = await canAccessAdmin();

  if (!hasAccess) {
    redirect('/login?callbackUrl=/admin&error=AccessDenied');
  }

  const session = await auth();
  const user = session?.user as any;
  const isSuperadmin = user?.role === 'superadmin';

  return (
    <AdminLayoutClient
      username={user?.username}
      role={user?.role}
      isSuperadmin={isSuperadmin}
    >
      {children}
    </AdminLayoutClient>
  );
}
