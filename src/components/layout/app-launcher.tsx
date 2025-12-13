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
            className="fixed inset-0 z-[100] flex flex-col"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            {/* Full screen backdrop with blur */}
            <div className="absolute inset-0 bg-background/95 backdrop-blur-2xl" />

            {/* Full screen launcher container */}
            <div
                ref={containerRef}
                className="relative flex-1 flex flex-col w-full h-full overflow-hidden animate-in fade-in duration-200"
            >
                {/* Header with search - centered content */}
                <div className="w-full max-w-4xl mx-auto px-4 sm:px-8 pt-8 sm:pt-12 pb-4">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl sm:text-3xl font-bold gradient-text">Menu</h2>
                        <button
                            onClick={onClose}
                            className="p-3 rounded-xl hover:bg-white/10 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Search bar */}
                    <div className="relative max-w-xl mx-auto">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Type to search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-secondary/50 border border-white/10 rounded-2xl text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan/50 transition-all"
                        />
                    </div>

                    {/* Category tabs - scrollable on mobile, centered on desktop */}
                    <div className="flex flex-wrap justify-center gap-2 mt-6 px-4 sm:px-0">
                        {availableCategories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={cn(
                                    'px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0',
                                    activeCategory === cat.id
                                        ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
                                        : 'bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent'
                                )}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Items grid - centered with scroll */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
                    <div className="max-w-5xl mx-auto">
                        {filteredItems.length === 0 ? (
                            <div className="text-center py-16 text-muted-foreground">
                                <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <p className="text-lg">No items found</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 sm:gap-6">
                                {filteredItems.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={handleItemClick}
                                            className={cn(
                                                'flex flex-col items-center gap-3 p-4 sm:p-6 rounded-2xl transition-all group',
                                                isActive
                                                    ? 'bg-neon-cyan/20 border border-neon-cyan/30 shadow-neon-sm'
                                                    : 'hover:bg-white/5 border border-transparent hover:border-white/10'
                                            )}
                                        >
                                            <div className={cn(
                                                'w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all',
                                                isActive
                                                    ? 'bg-neon-cyan/30 text-neon-cyan'
                                                    : 'bg-secondary/70 text-muted-foreground group-hover:text-foreground group-hover:bg-secondary'
                                            )}>
                                                <item.icon className="w-7 h-7 sm:w-8 sm:h-8" />
                                            </div>
                                            <div className="text-center">
                                                <p className={cn(
                                                    'text-sm font-medium',
                                                    isActive ? 'text-neon-cyan' : 'text-foreground'
                                                )}>
                                                    {item.name}
                                                </p>
                                                {item.description && (
                                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1 hidden sm:block">
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
                </div>

                {/* Footer hint - fixed at bottom */}
                <div className="py-4 text-center text-sm text-muted-foreground border-t border-white/5">
                    Press <kbd className="px-2 py-1 rounded-lg bg-secondary text-foreground font-mono text-xs">Esc</kbd> to close
                </div>
            </div>
        </div>
    );
}
