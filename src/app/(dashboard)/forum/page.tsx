import Link from 'next/link';
import { db } from '@/db';
import { forumCategories, forumPosts, users, donationRanks } from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { 
  MessageSquare, Plus, Eye, MessageCircle, 
  Pin, Lock, ChevronRight, Folder
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatRelativeTime, getMinecraftAvatarUrl, getInitials } from '@/lib/utils';
import { UserInfoWithRank } from '@/components/user-info-with-rank';

async function getCategories() {
  try {
    const categories = await db.select().from(forumCategories).orderBy(forumCategories.orderIndex);
    
    // Get post counts for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const postCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(forumPosts)
          .where(eq(forumPosts.categoryId, category.id));
        
        return {
          ...category,
          postCount: postCount[0]?.count || 0,
        };
      })
    );
    
    return categoriesWithCounts;
  } catch {
    return [];
  }
}

async function getRecentPosts() {
  try {
    return await db
      .select({
        id: forumPosts.id,
        title: forumPosts.title,
        createdAt: forumPosts.createdAt,
        views: forumPosts.views,
        pinned: forumPosts.pinned,
        locked: forumPosts.locked,
        authorId: forumPosts.authorId,
        authorUsername: users.username,
        authorMinecraft: users.minecraftUsername,
        authorRole: users.role,
        authorRankId: users.donationRankId,
        authorRankExpiresAt: users.rankExpiresAt,
        // Rank details
        rankName: donationRanks.name,
        rankColor: donationRanks.color,
        rankTextColor: donationRanks.textColor,
        rankIcon: donationRanks.icon,
        rankBadge: donationRanks.badge,
        rankGlow: donationRanks.glow,
        categoryId: forumPosts.categoryId,
        categoryName: forumCategories.name,
        categorySlug: forumCategories.slug,
      })
      .from(forumPosts)
      .leftJoin(users, eq(forumPosts.authorId, users.id))
      .leftJoin(donationRanks, eq(users.donationRankId, donationRanks.id))
      .leftJoin(forumCategories, eq(forumPosts.categoryId, forumCategories.id))
      .orderBy(desc(forumPosts.pinned), desc(forumPosts.createdAt))
      .limit(10);
  } catch {
    return [];
  }
}

export default async function ForumPage() {
  const [categories, recentPosts] = await Promise.all([
    getCategories(),
    getRecentPosts(),
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold gradient-text mb-2">
            Community Forum
          </h1>
          <p className="text-muted-foreground">
            Discuss, share, and connect with the community
          </p>
        </div>
        <Link href="/forum/new">
          <Button variant="gradient">
            <Plus className="w-4 h-4 mr-2" />
            New Post
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Categories - Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Folder className="w-5 h-5 text-neon-cyan" />
                Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {categories.length > 0 ? (
                categories.map((category) => (
                  <Link key={category.id} href={`/forum/category/${category.slug}`}>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-lg bg-neon-purple/10 group-hover:bg-neon-purple/20 transition-colors flex items-center justify-center text-xl">
                          {category.icon || '💬'}
                        </div>
                        <div>
                          <h3 className="font-semibold group-hover:text-neon-cyan transition-colors">
                            {category.name}
                          </h3>
                          {category.description && (
                            <p className="text-sm text-muted-foreground">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary">
                          {category.postCount} posts
                        </Badge>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-neon-cyan transition-colors" />
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No categories available yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Posts */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-neon-pink" />
                Recent Discussions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentPosts.length > 0 ? (
                recentPosts.map((post) => (
                  <Link key={post.id} href={`/forum/post/${post.id}`}>
                    <div className="flex items-start gap-4 p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {post.pinned && (
                            <Pin className="w-3 h-3 text-neon-orange" />
                          )}
                          {post.locked && (
                            <Lock className="w-3 h-3 text-muted-foreground" />
                          )}
                          <h3 className="font-medium truncate group-hover:text-neon-cyan transition-colors">
                            {post.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <UserInfoWithRank
                            username={post.authorUsername || 'Unknown'}
                            minecraftUsername={post.authorMinecraft}
                            role={post.authorRole || undefined}
                            donationRank={
                              post.authorRankId && post.authorRankExpiresAt && new Date(post.authorRankExpiresAt) > new Date()
                                ? {
                                    id: post.authorRankId,
                                    name: post.rankName || 'Supporter',
                                    color: post.rankColor || '#00D9FF',
                                    textColor: post.rankTextColor || '#00D9FF',
                                    icon: post.rankIcon,
                                    badge: post.rankBadge,
                                    glow: post.rankGlow || false,
                                  }
                                : null
                            }
                            showAvatar={false}
                            badgeSize="sm"
                          />
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">{formatRelativeTime(post.createdAt)}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Eye className="w-3 h-3" />
                            {post.views}
                          </span>
                        </div>
                      </div>

                      {post.categoryName && (
                        <Badge variant="outline" className="shrink-0">
                          {post.categoryName}
                        </Badge>
                      )}
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No posts yet. Be the first to start a discussion!</p>
                  <Link href="/forum/new" className="mt-4 inline-block">
                    <Button variant="neon-outline">Create Post</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Right Column */}
        <div className="space-y-6">
          {/* Forum Stats */}
          <Card variant="neon-glow">
            <CardHeader>
              <CardTitle>Forum Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Posts</span>
                <span className="font-bold">{recentPosts.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Categories</span>
                <span className="font-bold">{categories.length}</span>
              </div>
            </CardContent>
          </Card>

          {/* Forum Rules */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Forum Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-neon-cyan font-bold">1.</span>
                <span className="text-muted-foreground">Be respectful to all members</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-neon-cyan font-bold">2.</span>
                <span className="text-muted-foreground">No spam or self-promotion</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-neon-cyan font-bold">3.</span>
                <span className="text-muted-foreground">Stay on topic in discussions</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-neon-cyan font-bold">4.</span>
                <span className="text-muted-foreground">No inappropriate content</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
