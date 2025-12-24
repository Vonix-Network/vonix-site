'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Menu,
  Home,
  Settings,
  LogOut,
  LogIn,
  UserPlus,
  Shield,
  ChevronDown,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getMinecraftAvatarUrl } from '@/lib/utils';
import { NotificationBell } from './notification-bell';
import { AppLauncher } from './app-launcher';

export function Navbar() {
  const { data: session, status } = useSession();
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isAdmin = session?.user && ['admin', 'superadmin'].includes((session.user as any).role);

  return (
    <>
      {/* Top Left - Hamburger Menu */}
      <div className="fixed top-4 left-4 z-50">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setLauncherOpen(true)}
          className="flex items-center justify-center p-3 rounded-full bg-background/50 backdrop-blur-md border border-white/10 text-muted-foreground hover:text-neon-cyan hover:border-neon-cyan/50 shadow-lg transition-colors group"
        >
          <Menu className="w-6 h-6" />
          <span className="sr-only">Open Menu</span>
        </motion.button>
      </div>

      {/* Top Right - Auth & Profile Pills */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
        {status === 'loading' ? (
          <div className="h-10 w-32 rounded-full bg-background/50 backdrop-blur-md border border-white/10 animate-pulse" />
        ) : session?.user ? (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            {/* Notification Bell Pill */}
            <div className="hidden sm:block">
              <NotificationBell />
            </div>

            {/* Profile Pill */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={cn(
                  "flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-full bg-background/50 backdrop-blur-md border shadow-lg transition-all",
                  userMenuOpen
                    ? "border-neon-cyan/50 shadow-[0_0_15px_rgba(0,217,255,0.2)]"
                    : "border-white/10 hover:border-white/20"
                )}
              >
                <Avatar className="w-8 h-8 border border-white/10">
                  <AvatarImage
                    src={(session.user as any).avatar || getMinecraftAvatarUrl((session.user as any).username || session.user.name || '')}
                  />
                  <AvatarFallback className="bg-secondary text-xs">
                    {session.user.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start mr-1">
                  <span className="text-sm font-medium leading-none">
                    {(session.user as any).username || session.user.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground leading-none mt-1">
                    Online
                  </span>
                </div>
                <ChevronDown className={cn(
                  'w-4 h-4 text-muted-foreground transition-transform duration-200',
                  userMenuOpen && 'rotate-180 text-neon-cyan'
                )} />
              </motion.button>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 top-full mt-2 w-64 bg-[#0a0a0a]/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl py-2 z-50 overflow-hidden"
                    >
                      <div className="px-5 py-3 border-b border-white/5 bg-white/5">
                        <p className="text-sm font-medium text-foreground">{(session.user as any).username || session.user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
                      </div>

                      <div className="p-2 space-y-1">
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Home className="w-4 h-4" />
                          Dashboard
                        </Link>
                        <Link
                          href="/settings"
                          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings className="w-4 h-4" />
                          Settings
                        </Link>
                        {isAdmin && (
                          <Link
                            href="/admin"
                            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Shield className="w-4 h-4" />
                            Admin Panel
                          </Link>
                        )}
                      </div>

                      <div className="p-2 border-t border-white/5">
                        <button
                          onClick={() => signOut()}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-error hover:bg-error/10 w-full transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-background/50 backdrop-blur-md border border-white/10 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors shadow-lg"
              >
                <LogIn className="w-4 h-4" />
                <span>Login</span>
              </motion.button>
            </Link>

            <Link href="/register">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-full bg-neon-cyan/10 backdrop-blur-md border border-neon-cyan/20 text-sm font-medium text-neon-cyan hover:bg-neon-cyan/20 hover:border-neon-cyan/50 transition-colors shadow-[0_0_15px_rgba(0,217,255,0.1)]"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register</span>
              </motion.button>
            </Link>
          </motion.div>
        )}
      </div>

      {/* Main Navigation Overlay */}
      <AppLauncher isOpen={launcherOpen} onClose={() => setLauncherOpen(false)} />
    </>
  );
}

