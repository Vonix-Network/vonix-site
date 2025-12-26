'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, Users, Server,
    Heart, Settings, Shield, BarChart3, Bell, Key, Calendar, Crown, MessageSquare, Activity, Gamepad2, Menu, X,
    ChevronDown, LifeBuoy
} from 'lucide-react';

interface NavGroup {
    label: string;
    items: { href: string; icon: any; label: string }[];
}

const adminNavGroups: NavGroup[] = [
    {
        label: 'Overview',
        items: [
            { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
            { href: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
            { href: '/admin/status', icon: Activity, label: 'Status' },
        ],
    },
    {
        label: 'Community',
        items: [
            { href: '/admin/users', icon: Users, label: 'Users' },
            { href: '/admin/forum', icon: MessageSquare, label: 'Forum' },
            { href: '/admin/moderation', icon: Shield, label: 'Moderation' },
        ],
    },
    {
        label: 'Server',
        items: [
            { href: '/admin/servers', icon: Server, label: 'Servers' },
            { href: '/admin/events', icon: Calendar, label: 'Events' },
        ],
    },
    {
        label: 'Revenue',
        items: [
            { href: '/admin/donations', icon: Heart, label: 'Donations' },
            { href: '/admin/donor-ranks', icon: Crown, label: 'Donor Ranks' },
        ],
    },
    {
        label: 'Support',
        items: [
            { href: '/admin/helpdesk', icon: LifeBuoy, label: 'Help Desk' },
        ],
    },
    {
        label: 'System',
        items: [
            { href: '/admin/api-keys', icon: Key, label: 'API Keys' },
            { href: '/admin/settings', icon: Settings, label: 'Settings' },
        ],
    },
];

const superadminNav = [
    { href: '/panel', icon: Gamepad2, label: 'Server Panel' },
    { href: '/admin/pterodactyl', icon: Settings, label: 'Pterodactyl Settings' },
];

interface AdminLayoutClientProps {
    children: React.ReactNode;
    username?: string;
    role?: string;
    isSuperadmin: boolean;
}

export function AdminLayoutClient({ children, username, role, isSuperadmin }: AdminLayoutClientProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<string[]>(['Overview', 'Support']); // Default expanded
    const pathname = usePathname();

    const toggleGroup = (label: string) => {
        setExpandedGroups(prev =>
            prev.includes(label) ? prev.filter((g: any) => g !== label) : [...prev, label]
        );
    };

    const isActive = (href: string) => {
        if (!pathname) return false;
        if (href === '/admin') return pathname === '/admin';
        return pathname.startsWith(href);
    };

    return (
        <div className="min-h-screen bg-background flex relative">
            {/* Mobile Sidebar Backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
        fixed z-50 md:z-auto
        w-64 border-r border-border bg-card/95 md:bg-card/50 backdrop-blur-xl h-full
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
                <div className="p-6 flex items-center justify-between">
                    <Link href="/admin" className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-cyan via-neon-purple to-neon-pink flex items-center justify-center">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg">Admin Panel</h1>
                            <p className="text-xs text-muted-foreground">Vonix Network</p>
                        </div>
                    </Link>
                    {/* Mobile Close Button */}
                    <button
                        className="md:hidden p-2 rounded-lg hover:bg-secondary"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="px-3 overflow-y-auto max-h-[calc(100vh-180px)]">
                    {adminNavGroups.map((group: any) => {
                        const isExpanded = expandedGroups.includes(group.label);
                        const hasActiveItem = group.items.some((item: any) => isActive(item.href));

                        return (
                            <div key={group.label} className="mb-1">
                                <button
                                    onClick={() => toggleGroup(group.label)}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${hasActiveItem ? 'text-neon-cyan' : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    <span>{group.label}</span>
                                    <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                </button>
                                {isExpanded && (
                                    <div className="ml-2 space-y-0.5">
                                        {group.items.map((item: any) => (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setSidebarOpen(false)}
                                                className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${isActive(item.href)
                                                    ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30'
                                                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                                                    }`}
                                            >
                                                <item.icon className="w-4 h-4" />
                                                {item.label}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Superadmin-only Pterodactyl section */}
                    {isSuperadmin && (
                        <>
                            <div className="pt-4 pb-2 px-3">
                                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
                                    <Gamepad2 className="w-3 h-3" />
                                    Pterodactyl
                                </p>
                            </div>
                            {superadminNav.map((item: any) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${isActive(item.href)
                                        ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                                        }`}
                                >
                                    <item.icon className="w-4 h-4" />
                                    {item.label}
                                </Link>
                            ))}
                        </>
                    )}
                </nav>

                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card/50">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        ← Back to Dashboard
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-0 md:ml-64 min-w-0">
                <header className="h-16 border-b border-border bg-card/50 backdrop-blur-xl flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
                    <div className="flex items-center gap-4 min-w-0">
                        {/* Mobile Hamburger */}
                        <button
                            className="md:hidden p-2 rounded-lg hover:bg-secondary flex-shrink-0"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <h2 className="font-semibold hidden sm:block">Administration</h2>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                        <button className="p-2 rounded-lg hover:bg-secondary transition-colors relative">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" />
                        </button>
                        <div className="flex items-center gap-2">
                            <span className="text-sm hidden sm:inline">{username}</span>
                            <span className="px-2 py-1 rounded text-xs bg-neon-pink/20 text-neon-pink">
                                {role}
                            </span>
                        </div>
                    </div>
                </header>
                <div className="p-4 md:p-6 min-w-0">
                    {children}
                </div>
            </main>
        </div>
    );
}
