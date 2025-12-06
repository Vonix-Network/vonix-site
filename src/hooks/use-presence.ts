'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';

// How often to send heartbeat (2 minutes)
const HEARTBEAT_INTERVAL = 2 * 60 * 1000;
// Presence timeout (must match backend - 5 minutes)
const PRESENCE_TIMEOUT = 5 * 60 * 1000;

export interface PresenceStatus {
  online: boolean;
  lastSeenAt: string | null;
}

/**
 * Hook that sends presence heartbeats while user is active on the site
 */
export function usePresenceHeartbeat() {
  const { data: session } = useSession();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const sendHeartbeat = useCallback(async () => {
    if (!session?.user) return;
    
    try {
      await fetch('/api/presence', { method: 'POST' });
    } catch (error) {
      console.error('Failed to send presence heartbeat:', error);
    }
  }, [session?.user]);

  useEffect(() => {
    if (!session?.user) return;

    // Send immediately on mount
    sendHeartbeat();

    // Then send at regular intervals
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // Also send on visibility change (when user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session?.user, sendHeartbeat]);
}

/**
 * Hook to get presence status for a list of user IDs
 */
export function useUserPresence(userIds: number[]) {
  const [presence, setPresence] = useState<Record<number, PresenceStatus>>({});
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();

  const fetchPresence = useCallback(async () => {
    if (!session?.user || userIds.length === 0) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/presence?userIds=${userIds.join(',')}`);
      if (res.ok) {
        const data = await res.json();
        setPresence(data.presence || {});
      }
    } catch (error) {
      console.error('Failed to fetch presence:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.user, userIds]);

  useEffect(() => {
    fetchPresence();
    // Refresh presence every 30 seconds
    const interval = setInterval(fetchPresence, 30000);
    return () => clearInterval(interval);
  }, [fetchPresence]);

  return { presence, loading, refetch: fetchPresence };
}

/**
 * Check if a user is online based on lastSeenAt timestamp
 */
export function isUserOnline(lastSeenAt: Date | string | null | undefined): boolean {
  if (!lastSeenAt) return false;
  const lastSeen = new Date(lastSeenAt).getTime();
  return (Date.now() - lastSeen) < PRESENCE_TIMEOUT;
}

/**
 * Format last seen time for display
 */
export function formatLastSeen(lastSeenAt: Date | string | null | undefined): string {
  if (!lastSeenAt) return 'Never';
  
  const lastSeen = new Date(lastSeenAt);
  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return lastSeen.toLocaleDateString();
}


