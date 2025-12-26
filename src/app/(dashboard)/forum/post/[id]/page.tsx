import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { db } from '@/db';
import { forumPosts, forumReplies, forumCategories, users, donationRanks } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { ForumPostClient, ForumPost, ForumReply } from './post-client';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getPost(id: number) {
  try {
    const [post] = await db
      .select({
        id: forumPosts.id,
        title: forumPosts.title,
        content: forumPosts.content,
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
        rankName: donationRanks.name,
        rankColor: donationRanks.color,
        categoryId: forumPosts.categoryId,
        categoryName: forumCategories.name,
        categorySlug: forumCategories.slug,
      })
      .from(forumPosts)
      .leftJoin(users, eq(forumPosts.authorId, users.id))
      .leftJoin(donationRanks, eq(users.donationRankId, donationRanks.id))
      .leftJoin(forumCategories, eq(forumPosts.categoryId, forumCategories.id))
      .where(eq(forumPosts.id, id))
      .limit(1);

    if (!post) return null;

    // Get replies
    const replies = await db
      .select({
        id: forumReplies.id,
        content: forumReplies.content,
        createdAt: forumReplies.createdAt,
        authorId: forumReplies.authorId,
        authorUsername: users.username,
        authorMinecraft: users.minecraftUsername,
        authorRole: users.role,
        authorRankId: users.donationRankId,
        authorRankExpiresAt: users.rankExpiresAt,
        rankName: donationRanks.name,
        rankColor: donationRanks.color,
      })
      .from(forumReplies)
      .leftJoin(users, eq(forumReplies.authorId, users.id))
      .leftJoin(donationRanks, eq(users.donationRankId, donationRanks.id))
      .where(eq(forumReplies.postId, id))
      .orderBy(forumReplies.createdAt);

    return { post, replies };
  } catch (error: any) {
    console.error('Error fetching post:', error);
    return null;
  }
}

async function incrementViews(id: number) {
  try {
    await db
      .update(forumPosts)
      .set({ views: sql`${forumPosts.views} + 1` })
      .where(eq(forumPosts.id, id));
  } catch (error: any) {
    console.error('Error incrementing views:', error);
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const postId = parseInt(id);
  if (isNaN(postId)) return { title: 'Post Not Found' };

  const data = await getPost(postId);
  if (!data) return { title: 'Post Not Found' };

  const { post } = data;
  const description = post.content.substring(0, 160).replace(/\n/g, ' ') + (post.content.length > 160 ? '...' : '');

  return {
    title: post.title,
    description: description,
    openGraph: {
      title: post.title,
      description: description,
      type: 'article',
      authors: [post.authorUsername || 'Vonix User'],
      publishedTime: new Date(post.createdAt).toISOString(),
    },
  };
}

export default async function ForumPostPage({ params }: PageProps) {
  const { id } = await params;
  const postId = parseInt(id);

  if (isNaN(postId)) {
    notFound();
  }

  const data = await getPost(postId);

  if (!data) {
    notFound();
  }

  // Increment views
  await incrementViews(postId);

  return <ForumPostClient post={data.post as ForumPost} replies={data.replies as ForumReply[]} />;
}
