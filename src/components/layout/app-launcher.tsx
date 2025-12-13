'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
    Home,
    Server,
    HardDrive,
    MessageSquare,
    Users,
    Trophy,
    Calendar,
    Heart,
    LifeBuoy,
    Search,
    X,
    Settings,
    LayoutDashboard,
    Shield,
    Ticket,
    Gamepad2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LauncherItem {
    name: string;
    href: string;
    icon: any;
    category: 'main' | 'community' | 'account' | 'admin';
    description?: string;
    requiresAuth?: boolean;
    requiresAdmin?: boolean;
}

const launcherItems: LauncherItem[] = [
    // Main
    { name: 'Home', href: '/', icon: Home, category: 'main', description: 'Back to homepage' },
    { name: 'Servers', href: '/servers', icon: Server, category: 'main', description: 'View server status' },
    { name: 'Hosting', href: '/hosting', icon: HardDrive, category: 'main', description: 'Game server hosting' },

    // Community
    { name: 'Forum', href: '/forum', icon: MessageSquare, category: 'community', description: 'Community discussions' },
    { name: 'Users', href: '/users', icon: Users, category: 'community', description: 'Browse players' },
    { name: 'Leaderboard', href: '/leaderboard', icon: Trophy, category: 'community', description: 'Top players' },
    { name: 'Events', href: '/events', icon: Calendar, category: 'community', description: 'Upcoming events' },

    // Account (requires auth)
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, category: 'account', description: 'Your dashboard', requiresAuth: true },
    { name: 'Settings', href: '/settings', icon: Settings, category: 'account', description: 'Account settings', requiresAuth: true },
    { name: 'Donate', href: '/donate', icon: Heart, category: 'account', description: 'Support the server' },
    { name: 'Support', href: '/support', icon: Ticket, category: 'account', description: 'Get help', requiresAuth: true },

    // Admin (requires admin role)
    { name: 'Admin Panel', href: '/admin', icon: Shield, category: 'admin', description: 'Manage the site', requiresAdmin: true },
    { name: 'Server Panel', href: '/panel', icon: Gamepad2, category: 'admin', description: 'Server control', requiresAdmin: true },
];

const categories = [
    { id: 'all', label: 'All' },
    { id: 'main', label: 'Main' },
    { id: 'community', label: 'Community' },
    { id: 'account', label: 'Account' },
    { id: 'admin', label: 'Admin' },
];

interface AppLauncherProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AppLauncher({ isOpen, onClose }: AppLauncherProps) {
    const { data: session } = useSession();
    const pathname = usePathname();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const searchInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const isAdmin = session?.user && ['admin', 'superadmin', 'moderator'].includes((session.user as any).role);
    const isLoggedIn = !!session?.user;

    // Filter items based on auth state
    const availableItems = launcherItems.filter(item => {
        if (item.requiresAdmin && !isAdmin) return false;
        if (item.requiresAuth && !isLoggedIn) return false;
        return true;
    });

    // Filter by category and search
    const filteredItems = availableItems.filter(item => {
        const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
        const matchesSearch = searchQuery === '' ||
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // Focus search input when opened
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
        }
        if (!isOpen) {
            setSearchQuery('');
            setActiveCategory('all');
        }
    }, [isOpen]);

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const handleItemClick = useCallback(() => {
        onClose();
    }, [onClose]);

    if (!isOpen) return null;

    // Filter categories to only show those with items
    const availableCategories = categories.filter(cat =>
        cat.id === 'all' || availableItems.some(item => item.category === cat.id)
    );

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            {/* Backdrop with blur */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />

            {/* Launcher container */}
            <div
                ref={containerRef}
                className="relative w-full max-w-4xl mx-4 max-h-[85vh] flex flex-col bg-card/95 rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            >
                {/* Header with search */}
                <div className="p-4 sm:p-6 border-b border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl sm:text-2xl font-bold gradient-text">Menu</h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Search bar */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-secondary/50 border border-white/10 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan/50 transition-all"
                        />
                    </div>

                    {/* Category tabs */}
                    <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
                        {availableCategories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={cn(
                                    'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                                    activeCategory === cat.id
                                        ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
                                        : 'bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary'
                                )}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Items grid */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {filteredItems.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No items found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                            {filteredItems.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={handleItemClick}
                                        className={cn(
                                            'flex flex-col items-center gap-2 p-4 rounded-xl transition-all group',
                                            isActive
                                                ? 'bg-neon-cyan/20 border border-neon-cyan/30 shadow-neon-sm'
                                                : 'hover:bg-white/5 border border-transparent hover:border-white/10'
                                        )}
                                    >
                                        <div className={cn(
                                            'w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center transition-all',
                                            isActive
                                                ? 'bg-neon-cyan/30 text-neon-cyan'
                                                : 'bg-secondary/70 text-muted-foreground group-hover:text-foreground group-hover:bg-secondary'
                                        )}>
                                            <item.icon className="w-6 h-6 sm:w-7 sm:h-7" />
                                        </div>
                                        <div className="text-center">
                                            <p className={cn(
                                                'text-sm font-medium',
                                                isActive ? 'text-neon-cyan' : 'text-foreground'
                                            )}>
                                                {item.name}
                                            </p>
                                            {item.description && (
                                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 hidden sm:block">
                                                    {item.description}
                                                </p>
                                            )}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer hint */}
                <div className="p-3 border-t border-white/10 text-center text-xs text-muted-foreground hidden sm:block">
                    Press <kbd className="px-1.5 py-0.5 rounded bg-secondary text-foreground font-mono">Esc</kbd> to close
                </div>
            </div>
        </div>
    );
}
