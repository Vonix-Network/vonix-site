'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import {
  Home,
  Settings,
  LogOut,
  LogIn,
  UserPlus,
  Shield,
  ChevronDown,
  Grid3X3,
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
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* Glassmorphism background */}
      <div className="absolute inset-0 glass-card" />

      {/* Neon border bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-cyan/50 to-transparent" />

      <nav className="relative container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative w-10 h-10 flex items-center justify-center">
            {/* Logo V with neon gradient */}
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full"
              fill="none"
            >
              <defs>
                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00D9FF" />
                  <stop offset="50%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#EC4899" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <path
                d="M20 25 L50 85 L80 25"
                stroke="url(#logoGradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow)"
                className="group-hover:drop-shadow-[0_0_10px_rgba(0,217,255,0.8)] transition-all duration-300"
              />
            </svg>
          </div>
          <span className="text-xl font-bold gradient-text hidden sm:block">
            Vonix Network
          </span>
        </Link>

        {/* Right side - Menu + Auth */}
        <div className="flex items-center gap-2 sm:gap-3">
          {status === 'loading' ? (
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
          ) : session?.user ? (
            <>
              <NotificationBell />
              {/* Menu Launcher Button */}
              <button
                onClick={() => setLauncherOpen(true)}
                className="p-2.5 rounded-xl bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-neon-cyan transition-all duration-200"
                title="Menu"
              >
                <Grid3X3 className="w-5 h-5" />
              </button>
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <Avatar glow className="w-8 h-8">
                    <AvatarImage
                      src={(session.user as any).avatar || getMinecraftAvatarUrl((session.user as any).username || session.user.name || '')}
                    />
                    <AvatarFallback>
                      {session.user.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm font-medium">
                    {(session.user as any).username || session.user.name}
                  </span>
                  <ChevronDown className={cn(
                    'w-4 h-4 transition-transform',
                    userMenuOpen && 'rotate-180'
                  )} />
                </button>

                {/* User dropdown */}
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-card rounded-xl border border-white/10 shadow-neon py-2 z-50">
                      <div className="px-4 py-2 border-b border-white/10">
                        <p className="text-sm font-medium">{(session.user as any).username || session.user.name}</p>
                        <p className="text-xs text-muted-foreground">{session.user.email}</p>
                      </div>

                      <Link
                        href="/dashboard"
                        className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-white/5 transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Home className="w-4 h-4" />
                        Dashboard
                      </Link>

                      <Link
                        href="/settings"
                        className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-white/5 transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>

                      {isAdmin && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-neon-cyan hover:bg-white/5 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Shield className="w-4 h-4" />
                          Admin Panel
                        </Link>
                      )}

                      <div className="border-t border-white/10 mt-2 pt-2">
                        <button
                          onClick={() => signOut()}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-error hover:bg-white/5 transition-colors w-full"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              {/* Menu Launcher Button for non-logged-in users */}
              <button
                onClick={() => setLauncherOpen(true)}
                className="p-2.5 rounded-xl bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-neon-cyan transition-all duration-200"
                title="Menu"
              >
                <Grid3X3 className="w-5 h-5" />
              </button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">
                  <LogIn className="w-4 h-4 mr-2" />
                  Login
                </Link>
              </Button>
              <Button variant="neon" size="sm" asChild className="hidden sm:flex">
                <Link href="/register">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Register
                </Link>
              </Button>
            </div>
          )}
        </div>
      </nav>

      {/* App Launcher */}
      <AppLauncher isOpen={launcherOpen} onClose={() => setLauncherOpen(false)} />
    </header>
  );
}

