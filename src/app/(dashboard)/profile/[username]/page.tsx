import { notFound } from 'next/navigation';
import { db } from '@/db';
import { users, socialPosts, forumPosts, userAchievements, achievements, donationRanks, friendships, serverXp } from '@/db/schema';
import { eq, desc, sql, and, or } from 'drizzle-orm';
import Link from 'next/link';
import {
  User, Calendar, Trophy, MessageSquare, Heart,
  Star, Clock, Shield, Crown, Gamepad2, ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  getMinecraftAvatarUrl, getMinecraftHeadUrl, getInitials,
  formatDate, formatRelativeTime, formatNumber, formatPlaytime
} from '@/lib/utils';
import { getLevelProgress } from '@/lib/xp-math';
import { RankBadge, RoleBadge, UserBadges } from '@/components/rank-badge';
import { formatRankExpiration } from '@/lib/ranks';
import { auth } from '../../../../../auth';
import { ProfileFriendActions, FriendshipStatus } from '@/components/profile-friend-actions';

// Force dynamic rendering to ensure fresh XP data
export const dynamic = 'force-dynamic';

import { Metadata } from 'next';

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const user = await getUser(username);

  if (!user) {
    return {
      title: 'User Not Found',
    };
  }

  const description = user.bio || `View ${user.username}'s profile on Vonix Network. Level ${user.level} ${user.role !== 'user' ? user.role : 'Member'}.`;

  return {
    title: user.username,
    description: description,
    openGraph: {
      title: `${user.username} | Vonix Network`,
      description: description,
      images: [
        {
          url: getMinecraftAvatarUrl(user.minecraftUsername || user.username),
          width: 64,
          height: 64,
          alt: user.username,
        },
      ],
    },
  };
}

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

async function getUser(username: string) {
  try {
    // Fetch user with their donation rank
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        minecraftUsername: users.minecraftUsername,
        minecraftUuid: users.minecraftUuid,
        avatar: users.avatar,
        bio: users.bio,
        donationRankId: users.donationRankId,
        rankExpiresAt: users.rankExpiresAt,
        totalDonated: users.totalDonated,
        xp: users.xp,
        level: users.level,
        title: users.title,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
        // Join with donation ranks
        rankName: donationRanks.name,
        rankColor: donationRanks.color,
      })
      .from(users)
      .leftJoin(donationRanks, eq(users.donationRankId, donationRanks.id))
      .where(eq(users.username, username))
      .limit(1);

    return user;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

async function getUserStats(userId: number) {
  try {
    const [socialPostsCount, forumPostsCount, serverXpData] = await Promise.all([
      db.select({ count: sql<number>`count(*)` })
        .from(socialPosts)
        .where(eq(socialPosts.userId, userId)),
      db.select({ count: sql<number>`count(*)` })
        .from(forumPosts)
        .where(eq(forumPosts.authorId, userId)),
      db.select({ playtimeSeconds: serverXp.playtimeSeconds })
        .from(serverXp)
        .where(eq(serverXp.userId, userId)),
    ]);

    // Sum up playtime from all servers
    const totalPlaytimeSeconds = serverXpData.reduce(
      (acc, record) => acc + (record.playtimeSeconds || 0),
      0
    );

    return {
      socialPosts: socialPostsCount[0]?.count || 0,
      forumPosts: forumPostsCount[0]?.count || 0,
      playtimeSeconds: totalPlaytimeSeconds,
    };
  } catch (err) {
    console.error('Error fetching user stats:', err);
    return { socialPosts: 0, forumPosts: 0, playtimeSeconds: 0 };
  }

}

async function getRecentPosts(userId: number) {
  try {
    return await db
      .select()
      .from(socialPosts)
      .where(eq(socialPosts.userId, userId))
      .orderBy(desc(socialPosts.createdAt))
      .limit(5);
  } catch {
    return [];
  }
}

async function getFriendshipStatus(viewerUserId: number | null, profileUserId: number): Promise<FriendshipStatus> {
  if (!viewerUserId || viewerUserId === profileUserId) return 'none';

  try {
    const rows = await db
      .select({
        status: friendships.status,
        userId: friendships.userId,
        friendId: friendships.friendId,
      })
      .from(friendships)
      .where(
        or(
          and(eq(friendships.userId, viewerUserId), eq(friendships.friendId, profileUserId)),
          and(eq(friendships.userId, profileUserId), eq(friendships.friendId, viewerUserId)),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) return 'none';
    if (row.status === 'accepted') return 'friends';
    if (row.status === 'pending') {
      // Check if this is an incoming request (profile user sent to viewer)
      if (row.userId === profileUserId && row.friendId === viewerUserId) {
        return 'incoming'; // Profile user sent request TO viewer - show accept/decline
      }
      return 'pending'; // Viewer sent request to profile user - show pending
    }
    return 'none';
  } catch {
    return 'none';
  }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const user = await getUser(username);

  if (!user) {
    notFound();
  }

  const session = await auth();
  const viewerId = session?.user ? parseInt(session.user.id as string) : null;

  const [stats, recentPosts, friendshipStatus] = await Promise.all([
    getUserStats(user.id),
    getRecentPosts(user.id),
    getFriendshipStatus(viewerId, user.id),
  ]);

  // Use Minecraft-based XP system
  const xpData = getLevelProgress(user.xp || 0);

  const isOwnProfile = viewerId !== null && viewerId === user.id;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Profile Header */}
      <Card variant="glass" className="mb-8 overflow-hidden">
        {/* Banner */}
        <div className="h-32 bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink" />

        <CardContent className="relative pt-0">
          {/* Avatar */}
          <div className="absolute -top-16 left-6">
            <Avatar className="w-32 h-32 border-4 border-background" glow>
              <AvatarImage
                src={getMinecraftAvatarUrl(user.minecraftUsername || user.username)}
                alt={user.username}
              />
              <AvatarFallback className="text-3xl">
                {getInitials(user.username)}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* User Info */}
          <div className="ml-40 pt-4 pb-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold">{user.username}</h1>
                  {user.role && user.role !== 'user' && <RoleBadge role={user.role} size="md" />}
                  {user.donationRankId && user.rankExpiresAt && new Date(user.rankExpiresAt) > new Date() && (
                    <RankBadge
                      rank={{
                        id: user.donationRankId,
                        name: user.rankName || 'Supporter',
                        color: user.rankColor || '#00D9FF',
                      }}
                      size="md"
                    />
                  )}
                </div>

                {user.title && (
                  <p className="text-neon-cyan mb-2">{user.title}</p>
                )}

                {user.minecraftUsername && (
                  <div className="flex items-center gap-2 text-muted-foreground mb-4">
                    <Gamepad2 className="w-4 h-4" />
                    <span>{user.minecraftUsername}</span>
                    <a
                      href={`https://namemc.com/profile/${user.minecraftUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neon-cyan hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {user.bio && (
                  <p className="text-muted-foreground max-w-xl">{user.bio}</p>
                )}

                <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Joined {formatDate(user.createdAt)}
                  </span>
                  {user.lastLoginAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Last seen {formatRelativeTime(user.lastLoginAt)}
                    </span>
                  )}
                </div>
              </div>

              <ProfileFriendActions
                isOwnProfile={isOwnProfile}
                friendshipStatus={friendshipStatus}
                profileUserId={user.id}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Level Progress */}
          <Card variant="neon-glow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-neon-orange/20 border border-neon-orange/50 flex items-center justify-center">
                    <Star className="w-6 h-6 text-neon-orange" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">Level {xpData.level}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatNumber(xpData.currentXp)} XP total
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Next level</p>
                  <p className="font-bold">{formatNumber(xpData.nextLevelXp - xpData.currentXp)} XP</p>
                </div>
              </div>
              <div className="h-3 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink transition-all duration-500"
                  style={{ width: `${xpData.progress}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {recentPosts.length > 0 ? (
                <div className="space-y-4">
                  {recentPosts.map((post) => (
                    <div key={post.id} className="p-4 rounded-lg bg-secondary/50">
                      <p className="mb-2">{post.content}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {post.likesCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          0 {/* Comments not implemented yet */}
                        </span>
                        <span>{formatRelativeTime(post.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No recent activity
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <MessageSquare className="w-4 h-4" />
                  Social Posts
                </span>
                <span className="font-bold">{stats.socialPosts}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <MessageSquare className="w-4 h-4" />
                  Forum Posts
                </span>
                <span className="font-bold">{stats.forumPosts}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Trophy className="w-4 h-4" />
                  Achievements
                </span>
                <span className="font-bold">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  Play Time
                </span>
                <span className="font-bold">{formatPlaytime(stats.playtimeSeconds)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Donation Rank */}
          {user.donationRankId && user.rankExpiresAt && new Date(user.rankExpiresAt) > new Date() && (
            <Card
              variant="glass"
              style={{ borderColor: `${user.rankColor}50` }}
            >
              <CardContent className="py-6 text-center relative overflow-hidden">
                <div
                  className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-3xl relative"
                  style={{
                    background: `${user.rankColor}20`,
                    border: `2px solid ${user.rankColor}50`,
                  }}
                >
                  {'👑'}
                </div>
                <h3 className="font-bold text-lg mb-1" style={{ color: user.rankColor || undefined }}>
                  {user.rankName || 'Supporter'}
                </h3>

                <p className="text-xs text-muted-foreground">
                  {formatRankExpiration(user.rankExpiresAt)}
                </p>
                {user.totalDonated && user.totalDonated > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">
                      Total donated: <span className="font-bold text-success">${user.totalDonated.toFixed(2)}</span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Minecraft Skin */}
          {user.minecraftUsername && (
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Minecraft Skin</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <img
                  src={`https://mc-heads.net/body/${user.minecraftUsername}/150`}
                  alt={`${user.minecraftUsername}'s skin`}
                  className="mx-auto"
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
