import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/db';
import { forumCategories, forumPosts, forumReplies, users, donationRanks } from '@/db/schema';
import { desc, eq, sql, and } from 'drizzle-orm';
import {
  MessageSquare, Plus, Eye, MessageCircle,
  Pin, Lock, ChevronLeft, Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils';
import { UserInfoWithRank } from '@/components/user-info-with-rank';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getCategory(slug: string) {
  try {
    const [category] = await db
      .select()
      .from(forumCategories)
      .where(eq(forumCategories.slug, slug))
      .limit(1);
    return category || null;
  } catch {
    return null;
  }
}

async function getCategoryPosts(categoryId: number) {
  try {
    const posts = await db
      .select({
        id: forumPosts.id,
        title: forumPosts.title,
        content: forumPosts.content,
        createdAt: forumPosts.createdAt,
        views: forumPosts.views,
        pinned: forumPosts.isPinned,
        locked: forumPosts.isLocked,
        authorId: forumPosts.authorId,
        authorUsername: users.username,
        authorMinecraft: users.minecraftUsername,
        authorRole: users.role,
        authorRankId: users.donationRankId,
        authorRankExpiresAt: users.rankExpiresAt,
        rankName: donationRanks.name,
        rankColor: donationRanks.color,
      })
      .from(forumPosts)
      .leftJoin(users, eq(forumPosts.authorId, users.id))
      .leftJoin(donationRanks, eq(users.donationRankId, donationRanks.id))
      .where(eq(forumPosts.categoryId, categoryId))
      .orderBy(desc(forumPosts.isPinned), desc(forumPosts.createdAt));

    // Get reply counts for each post
    const postsWithReplies = await Promise.all(
      posts.map(async (post) => {
        const [replyCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(forumReplies)
          .where(eq(forumReplies.postId, post.id));
        return {
          ...post,
          replyCount: replyCount?.count || 0,
        };
      })
    );

    return postsWithReplies;
  } catch {
    return [];
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const category = await getCategory(slug);

  if (!category) {
    notFound();
  }

  const posts = await getCategoryPosts(category.id);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/forum"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Forum
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-neon-purple/10 flex items-center justify-center text-3xl">
            {category.icon || '💬'}
          </div>
          <div>
            <h1 className="text-3xl font-bold gradient-text">
              {category.name}
            </h1>
            {category.description && (
              <p className="text-muted-foreground mt-1">
                {category.description}
              </p>
            )}
          </div>
        </div>
        <Link href={`/forum/new?category=${category.id}`}>
          <Button variant="gradient">
            <Plus className="w-4 h-4 mr-2" />
            New Post
          </Button>
        </Link>
      </div>

      {/* Posts List */}
      <Card variant="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-neon-cyan" />
              Discussions
            </CardTitle>
            <Badge variant="secondary">{posts.length} posts</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {posts.length > 0 ? (
            <div className="space-y-2">
              {posts.map((post) => (
                <Link key={post.id} href={`/forum/post/${post.id}`}>
                  <div className="flex items-start gap-4 p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {post.pinned && (
                          <Badge variant="neon-orange" className="text-xs">
                            <Pin className="w-3 h-3 mr-1" />
                            Pinned
                          </Badge>
                        )}
                        {post.locked && (
                          <Badge variant="secondary" className="text-xs">
                            <Lock className="w-3 h-3 mr-1" />
                            Locked
                          </Badge>
                        )}
                        <h3 className="font-semibold truncate group-hover:text-neon-cyan transition-colors">
                          {post.title}
                        </h3>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {post.content.substring(0, 200)}
                        {post.content.length > 200 ? '...' : ''}
                      </p>

                      <div className="flex items-center gap-4 text-sm">
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
                                textColor: post.rankColor || '#00D9FF',
                                icon: null,
                                badge: null,
                                glow: false,
                              }
                              : null
                          }
                          showAvatar={false}
                          badgeSize="sm"
                        />
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(post.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {post.views}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          {post.replyCount}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No posts yet</h3>
              <p className="mb-4">Be the first to start a discussion in this category!</p>
              <Link href={`/forum/new?category=${category.id}`}>
                <Button variant="neon">Create First Post</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
