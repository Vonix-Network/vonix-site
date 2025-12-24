'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
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
    { name: 'Help Desk', href: '/helpdesk', icon: LifeBuoy, category: 'account', description: 'Get support' },

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

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1
        }
    },
    exit: {
        opacity: 0,
        transition: {
            staggerChildren: 0.02,
            staggerDirection: -1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.9 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 24
        }
    },
    exit: { opacity: 0, y: 20, scale: 0.9 }
};

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
            setTimeout(() => {
                setSearchQuery('');
                setActiveCategory('all');
            }, 300); // Clear after exit animation
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

    // Filter categories to only show those with items
    const availableCategories = categories.filter(cat =>
        cat.id === 'all' || availableItems.some(item => item.category === cat.id)
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 z-[100] flex flex-col"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) onClose();
                    }}
                >
                    {/* Full screen backdrop with blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-[#0a0a0a]/98 backdrop-blur-3xl"
                    />

                    {/* Content Container */}
                    <div className="relative z-10 flex-1 flex flex-col overflow-hidden w-full h-full">
                        {/* Header with search - centered content */}
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="w-full max-w-4xl mx-auto px-4 sm:px-8 pt-8 sm:pt-12 pb-4"
                        >
                            <div className="relative flex items-center justify-center mb-8">
                                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neon-cyan via-purple-500 to-neon-pink">
                                    Vonix Network
                                </h2>
                                <button
                                    onClick={onClose}
                                    className="absolute right-0 p-3 rounded-full hover:bg-white/10 transition-colors group"
                                >
                                    <X className="w-6 h-6 text-muted-foreground group-hover:text-neon-cyan transition-colors" />
                                </button>
                            </div>

                            {/* Search bar */}
                            <div className="relative max-w-xl mx-auto mb-8">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Search pages..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/10 rounded-full text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan/50 transition-all shadow-lg"
                                />
                            </div>

                            {/* Category tabs */}
                            <div className="flex flex-wrap justify-center gap-2 px-4 sm:px-0">
                                {availableCategories.map((cat, i) => (
                                    <motion.button
                                        key={cat.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 + (i * 0.05) }}
                                        onClick={() => setActiveCategory(cat.id)}
                                        className={cn(
                                            'px-6 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border',
                                            activeCategory === cat.id
                                                ? 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30 shadow-[0_0_10px_rgba(0,217,255,0.2)]'
                                                : 'bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 border-transparent'
                                        )}
                                    >
                                        {cat.label}
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>

                        {/* Items grid */}
                        <motion.div
                            className="flex-1 overflow-y-auto px-4 sm:px-8 py-6"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        >
                            <div className="max-w-5xl mx-auto">
                                {filteredItems.length === 0 ? (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-center py-20 text-muted-foreground"
                                    >
                                        <Search className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                        <p className="text-xl">No items found</p>
                                    </motion.div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6 pb-20">
                                        {filteredItems.map((item) => {
                                            const isActive = pathname === item.href;
                                            return (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    onClick={onClose}
                                                    className="block h-full"
                                                >
                                                    <motion.div
                                                        variants={itemVariants}
                                                        className={cn(
                                                            'flex flex-col items-center gap-4 p-6 h-full rounded-3xl transition-all group relative overflow-hidden',
                                                            isActive
                                                                ? 'bg-gradient-to-br from-neon-cyan/20 to-purple-500/20 border border-neon-cyan/30 shadow-neon-sm'
                                                                : 'bg-white/[0.03] border border-white/5 hover:bg-white-[0.07] hover:border-white/10 hover:shadow-lg'
                                                        )}
                                                    >
                                                        {isActive && (
                                                            <div className="absolute inset-0 bg-neon-cyan/5 blur-xl" />
                                                        )}

                                                        <div className={cn(
                                                            'relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-inner',
                                                            isActive
                                                                ? 'bg-neon-cyan text-black shadow-[0_0_15px_rgba(0,217,255,0.5)]'
                                                                : 'bg-black/40 text-muted-foreground group-hover:text-neon-cyan group-hover:bg-black/60 group-hover:scale-110'
                                                        )}>
                                                            <item.icon className="w-8 h-8" />
                                                        </div>

                                                        <div className="relative text-center">
                                                            <p className={cn(
                                                                'text-base font-medium mb-1 transition-colors',
                                                                isActive ? 'text-neon-cyan' : 'text-foreground group-hover:text-white'
                                                            )}>
                                                                {item.name}
                                                            </p>
                                                            {item.description && (
                                                                <p className="text-xs text-muted-foreground line-clamp-1 group-hover:text-gray-400 transition-colors">
                                                                    {item.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* Footer hint */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="py-6 text-center text-sm text-muted-foreground border-t border-white/5 bg-[#0a0a0a]/50 backdrop-blur-md"
                        >
                            Press <kbd className="px-2 py-1 mx-1 rounded-lg bg-white/10 text-white font-mono text-xs">Esc</kbd> to close
                        </motion.div>
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
}
