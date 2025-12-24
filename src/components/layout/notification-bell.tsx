'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?unreadOnly=true&limit=1');
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notification count:', err);
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchUnreadCount();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [session, fetchUnreadCount]);

  if (!session?.user) {
    return null;
  }

  return (
    <Link
      href="/notifications"
      className={cn(
        'relative flex items-center justify-center p-3 rounded-full bg-background/50 backdrop-blur-md border border-white/10 shadow-lg transition-all duration-200',
        'text-muted-foreground hover:text-neon-cyan hover:border-neon-cyan/50 hover:bg-background/80',
        unreadCount > 0 && 'text-neon-cyan border-neon-cyan/50 shadow-[0_0_10px_rgba(0,217,255,0.2)]'
      )}
      title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-xs font-bold bg-error text-white rounded-full px-1">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}


