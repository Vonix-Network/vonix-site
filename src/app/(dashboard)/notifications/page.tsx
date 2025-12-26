'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Bell, Check, Trash2, Settings, MessageSquare,
  Heart, UserPlus, Trophy, Calendar, AlertCircle, Loader2, X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'friend_request':
      return <UserPlus className="w-5 h-5 text-neon-cyan" />;
    case 'like':
      return <Heart className="w-5 h-5 text-error" />;
    case 'comment':
      return <MessageSquare className="w-5 h-5 text-neon-purple" />;
    case 'achievement':
      return <Trophy className="w-5 h-5 text-neon-orange" />;
    case 'event':
      return <Calendar className="w-5 h-5 text-success" />;
    default:
      return <Bell className="w-5 h-5 text-muted-foreground" />;
  }
};

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/notifications');
    }
  }, [status, router]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const data = await res.json();
      setNotifications(data.notifications || []);
      setError(null);
    } catch (err: any) {
      setError('Failed to load notifications');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchNotifications();
    }
  }, [session, fetchNotifications]);

  const markAsRead = async (id: number) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
      if (res.ok) {
        setNotifications(notifications.map(n =>
          n.id === id ? { ...n, read: true } : n
        ));
      }
    } catch (err: any) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
      }
    } catch (err: any) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
      if (res.ok) {
        setNotifications(notifications.filter(n => n.id !== id));
      }
    } catch (err: any) {
      console.error('Failed to delete notification:', err);
    }
  };

  const clearAll = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setNotifications([]);
      }
    } catch (err: any) {
      console.error('Failed to clear all notifications:', err);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'You\'re all caught up!'
            }
          </p>
        </div>
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <Settings className="w-5 h-5" />
          </Button>
        </Link>
      </div>

      {/* Actions */}
      {notifications.length > 0 && (
        <div className="flex gap-2 mb-6">
          <Button
            variant="neon-outline"
            size="sm"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            <Check className="w-4 h-4 mr-2" />
            Mark All Read
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        </div>
      )}

      {/* Notifications List */}
      <Card variant="glass">
        <CardContent className="p-0">
          {notifications.length > 0 ? (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-4 p-4 hover:bg-secondary/50 transition-colors ${!notification.read ? 'bg-neon-cyan/5' : ''
                    }`}
                >
                  {/* Icon */}
                  <div className="p-2 rounded-lg bg-secondary/50">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  {notification.link ? (
                    <Link href={notification.link} className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`font-medium ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatRelativeTime(new Date(notification.createdAt))}
                          </p>
                        </div>
                        {!notification.read && (
                          <span className="w-2 h-2 rounded-full bg-neon-cyan shrink-0 mt-2" />
                        )}
                      </div>
                    </Link>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`font-medium ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatRelativeTime(new Date(notification.createdAt))}
                          </p>
                        </div>
                        {!notification.read && (
                          <span className="w-2 h-2 rounded-full bg-neon-cyan shrink-0 mt-2" />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-1">
                    {/* Friend request specific actions */}
                    {notification.type === 'friend_request' && !notification.read && (
                      <>
                        <Button
                          variant="neon"
                          size="sm"
                          onClick={async () => {
                            // Extract user ID from link if available (e.g., /profile/username)
                            // Or use the notification data
                            try {
                              // The link should be /friends for friend requests
                              const res = await fetch('/api/friends');
                              if (res.ok) {
                                const data = await res.json();
                                // Find matching incoming request by username from notification
                                const incomingRequest = data.pending?.find(
                                  (p: any) => p.type === 'incoming' && notification.message.includes(p.username)
                                );
                                if (incomingRequest) {
                                  const acceptRes = await fetch('/api/friends', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ targetUserId: incomingRequest.id, action: 'accept' }),
                                  });
                                  if (acceptRes.ok) {
                                    // Mark notification as read and refresh
                                    await markAsRead(notification.id);
                                    fetchNotifications();
                                  }
                                }
                              }
                            } catch (err: any) {
                              console.error('Failed to accept friend request:', err);
                            }
                          }}
                          className="h-8"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/friends');
                              if (res.ok) {
                                const data = await res.json();
                                const incomingRequest = data.pending?.find(
                                  (p: any) => p.type === 'incoming' && notification.message.includes(p.username)
                                );
                                if (incomingRequest) {
                                  const declineRes = await fetch('/api/friends', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ targetUserId: incomingRequest.id, action: 'decline' }),
                                  });
                                  if (declineRes.ok) {
                                    await deleteNotification(notification.id);
                                  }
                                }
                              }
                            } catch (err: any) {
                              console.error('Failed to decline friend request:', err);
                            }
                          }}
                          className="h-8"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Decline
                        </Button>
                      </>
                    )}
                    {/* Standard mark as read for non-friend-request notifications */}
                    {notification.type !== 'friend_request' && !notification.read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => markAsRead(notification.id)}
                        className="h-8 w-8"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteNotification(notification.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-error"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-bold mb-2">No Notifications</h3>
              <p className="text-muted-foreground">
                You&apos;re all caught up! Check back later.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Settings Hint */}
      <Card variant="gradient" className="mt-6">
        <CardContent className="py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-neon-cyan" />
            <span className="text-sm">
              Customize which notifications you receive
            </span>
          </div>
          <Link href="/settings">
            <Button variant="glass" size="sm">
              Settings
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

