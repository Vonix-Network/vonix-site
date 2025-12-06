import { redirect } from 'next/navigation';
import { auth } from '../../../auth';
import Link from 'next/link';
import { 
  LayoutDashboard, Users, Server, 
  Heart, Settings, Shield, BarChart3, Bell, Key, Calendar, Crown, MessageSquare, Activity
} from 'lucide-react';
import { canAccessAdmin } from '@/lib/auth-guard';

const adminNav = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/users', icon: Users, label: 'Users' },
  { href: '/admin/servers', icon: Server, label: 'Servers' },
  { href: '/admin/forum', icon: MessageSquare, label: 'Forum' },
  { href: '/admin/events', icon: Calendar, label: 'Events' },
  { href: '/admin/donor-ranks', icon: Crown, label: 'Donor Ranks' },
  { href: '/admin/donations', icon: Heart, label: 'Donations' },
  { href: '/admin/api-keys', icon: Key, label: 'API Keys' },
  { href: '/admin/moderation', icon: Shield, label: 'Moderation' },
  { href: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/admin/status', icon: Activity, label: 'Status' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
];

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

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/50 backdrop-blur-xl fixed h-full">
        <div className="p-6">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-cyan via-neon-purple to-neon-pink flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Admin Panel</h1>
              <p className="text-xs text-muted-foreground">Vonix Network</p>
            </div>
          </Link>
        </div>

        <nav className="px-3 space-y-1">
          {adminNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <Link 
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h2 className="font-semibold">Administration</h2>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-lg hover:bg-secondary transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm">{user?.username}</span>
              <span className="px-2 py-1 rounded text-xs bg-neon-pink/20 text-neon-pink">
                {user?.role}
              </span>
            </div>
          </div>
        </header>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

