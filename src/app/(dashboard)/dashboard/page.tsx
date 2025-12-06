'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  User, Settings, MessageSquare, Users, Trophy,
  Heart, Bell, Calendar, Gamepad2, TrendingUp,
  Star, Clock, Activity, Loader2, Pickaxe, Globe
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getMinecraftAvatarUrl, getInitials, formatRelativeTime, formatPlaytime } from '@/lib/utils';
import { getLevelProgress } from '@/lib/xp-math';

interface ActivityItem {
  id: number;
  action: string;
  time: Date;
  icon: 'post' | 'xp' | 'server' | 'friend';
}

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'event' | 'update';
  read: boolean;
}

interface UserData {
  xp: number;
  level: number;
  websiteXp: number;
  minecraftXp: number;
  postCount: number;
  friendCount: number;
  playtimeSeconds: number;
}

const quickLinks = [
  { href: '/servers', icon: Gamepad2, label: 'Servers', color: 'text-neon-cyan' },
  { href: '/forum', icon: MessageSquare, label: 'Forum', color: 'text-neon-purple' },
  { href: '/social', icon: Users, label: 'Social', color: 'text-neon-pink' },
  { href: '/leaderboard', icon: Trophy, label: 'Leaderboard', color: 'text-neon-orange' },
  { href: '/donate', icon: Heart, label: 'Donate', color: 'text-error' },
  { href: '/events', icon: Calendar, label: 'Events', color: 'text-success' },
];

export default function DashboardPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Use Minecraft-based XP system from xp-math.ts
  const xpData = getLevelProgress(userData?.xp || user?.xp || 0);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch fresh user data with XP (session data may be stale)
        const userRes = await fetch('/api/users/me');
        if (userRes.ok) {
          const freshUserData = await userRes.json();
          setUserData({
            xp: freshUserData.xp || 0,
            level: freshUserData.level || 1,
            websiteXp: freshUserData.websiteXp || 0,
            minecraftXp: freshUserData.minecraftXp || 0,
            postCount: freshUserData.postCount || 0,
            friendCount: freshUserData.friendCount || 0,
            playtimeSeconds: freshUserData.playtimeSeconds || 0,
          });
        }

        // Fetch recent activity from social posts
        const postsRes = await fetch('/api/social/posts?limit=3');
        if (postsRes.ok) {
          const posts = await postsRes.json();
          const recentActivities: ActivityItem[] = posts.slice(0, 3).map((post: any) => ({
            id: post.id,
            action: `Posted: "${post.content.substring(0, 40)}${post.content.length > 40 ? '...' : ''}"`,
            time: new Date(post.createdAt),
            icon: 'post' as const,
          }));
          setActivities(recentActivities);
        }

        // Fetch notifications from events
        const eventsRes = await fetch('/api/events?limit=3');
        if (eventsRes.ok) {
          const events = await eventsRes.json();
          const eventNotifs: NotificationItem[] = events.slice(0, 2).map((event: any) => ({
            id: event.id,
            title: event.title,
            message: event.description?.substring(0, 50) || 'Check it out!',
            type: 'event' as const,
            read: false,
          }));
          setNotifications(eventNotifs);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (session) {
      fetchDashboardData();
    } else {
      setIsLoading(false);
    }
  }, [session]);

  const getActivityIcon = (icon: string) => {
    switch (icon) {
      case 'post': return MessageSquare;
      case 'xp': return TrendingUp;
      case 'server': return Gamepad2;
      case 'friend': return Users;
      default: return Activity;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">
          Welcome back, {user?.username || 'Player'}!
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening in your Vonix Network account.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Card */}
          <Card variant="glass" hover>
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <Avatar className="w-20 h-20" glow>
                  <AvatarImage
                    src={getMinecraftAvatarUrl(user?.minecraftUsername || user?.username || '')}
                    alt={user?.username}
                  />
                  <AvatarFallback className="text-xl">
                    {getInitials(user?.username || 'U')}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold">{user?.username}</h2>
                    <Badge variant={user?.role === 'admin' ? 'neon-pink' : 'neon-cyan'}>
                      {user?.role || 'Member'}
                    </Badge>
                  </div>

                  {user?.minecraftUsername && (
                    <p className="text-muted-foreground mb-4">
                      Minecraft: <span className="text-foreground">{user.minecraftUsername}</span>
                    </p>
                  )}

                  {/* XP Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-neon-orange" />
                        Level {xpData.level}
                      </span>
                      <span className="text-muted-foreground">
                        {xpData.currentXp.toLocaleString()} / {xpData.nextLevelXp.toLocaleString()} XP
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink transition-all duration-500"
                        style={{ width: `${xpData.progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <Link href="/settings">
                  <Button variant="ghost" size="icon">
                    <Settings className="w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {quickLinks.map((link) => (
                  <Link key={link.href} href={link.href}>
                    <Card variant="default" hover className="h-full">
                      <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <link.icon className={`w-8 h-8 mb-2 ${link.color}`} />
                        <span className="font-medium">{link.label}</span>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-neon-cyan" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-neon-cyan" />
                </div>
              ) : activities.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No recent activity. Start exploring!
                </p>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => {
                    const IconComponent = getActivityIcon(activity.icon);
                    return (
                      <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50">
                        <div className="p-2 rounded-lg bg-neon-cyan/10">
                          <IconComponent className="w-4 h-4 text-neon-cyan" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{activity.action}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(activity.time)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Right Column */}
        <div className="space-y-6">
          {/* Stats Card */}
          <Card variant="neon-glow">
            <CardHeader>
              <CardTitle>Your Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* XP Breakdown */}
              <div className="space-y-3 pb-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Pickaxe className="w-4 h-4 text-neon-cyan" />
                    Minecraft XP
                  </span>
                  <span className="font-bold text-lg text-neon-cyan">
                    {(userData?.minecraftXp || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Globe className="w-4 h-4 text-neon-purple" />
                    Website XP
                  </span>
                  <span className="font-bold text-lg text-neon-purple">
                    {(userData?.websiteXp || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Star className="w-4 h-4 text-neon-orange" />
                    Total XP
                  </span>
                  <span className="font-bold text-lg gradient-text">
                    {(userData?.xp || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Other Stats */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <MessageSquare className="w-4 h-4" />
                    Forum Posts
                  </span>
                  <span className="font-bold text-lg">{userData?.postCount || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    Friends
                  </span>
                  <span className="font-bold text-lg">{userData?.friendCount || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    Play Time
                  </span>
                  <span className="font-bold text-lg">
                    {formatPlaytime(userData?.playtimeSeconds || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-neon-orange" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 text-sm">
                  No new notifications
                </p>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notif, i) => (
                    <div
                      key={notif.id}
                      className={`p-3 rounded-lg ${i === 0 ? 'bg-neon-cyan/10 border border-neon-cyan/20' : 'bg-secondary/50'}`}
                    >
                      <p className="text-sm font-medium">{notif.title}</p>
                      <p className="text-xs text-muted-foreground">{notif.message}</p>
                    </div>
                  ))}
                </div>
              )}
              <Link href="/notifications" className="block mt-4">
                <Button variant="ghost" className="w-full">
                  View All Notifications
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Friends Online */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-neon-purple" />
                Friends Online
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm text-center py-4">
                No friends online right now
              </p>
              <Link href="/friends">
                <Button variant="neon-outline" className="w-full">
                  Find Friends
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

