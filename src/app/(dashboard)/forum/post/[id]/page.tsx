'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { 
  MessageSquare, ChevronLeft, Eye, Clock, 
  Pin, Lock, Trash2, Edit, Send, Loader2,
  ThumbsUp, Flag, MoreVertical
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getMinecraftAvatarUrl, getInitials, formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';

interface ForumPost {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  views: number;
  pinned: boolean;
  locked: boolean;
  authorId: number;
  authorUsername: string;
  authorMinecraft: string | null;
  authorRole: string;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
}

interface ForumReply {
  id: number;
  content: string;
  createdAt: string;
  authorId: number;
  authorUsername: string;
  authorMinecraft: string | null;
  authorRole: string;
}

export default function ForumPostPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;
  
  const [post, setPost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const user = session?.user as any;

  useEffect(() => {
    fetchPost();
  }, [postId]);

  const fetchPost = async () => {
    try {
      const res = await fetch(`/api/forum/posts/${postId}`);
      if (res.ok) {
        const data = await res.json();
        setPost(data.post);
        setReplies(data.replies || []);
      } else if (res.status === 404) {
        router.push('/forum');
        toast.error('Post not found');
      }
    } catch (error) {
      console.error('Failed to fetch post:', error);
      toast.error('Failed to load post');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session) {
      toast.error('You must be signed in to reply');
      return;
    }

    if (!replyContent.trim()) {
      toast.error('Reply cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/forum/posts/${postId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent }),
      });

      if (res.ok) {
        const data = await res.json();
        setReplies([...replies, data.reply]);
        setReplyContent('');
        toast.success('Reply posted!');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to post reply');
      }
    } catch (error) {
      console.error('Failed to post reply:', error);
      toast.error('Failed to post reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const res = await fetch(`/api/forum/posts/${postId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Post deleted');
        router.push('/forum');
      } else {
        toast.error('Failed to delete post');
      }
    } catch (error) {
      console.error('Failed to delete post:', error);
      toast.error('Failed to delete post');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-xl font-semibold mb-2">Post not found</h2>
          <Link href="/forum">
            <Button variant="neon">Back to Forum</Button>
          </Link>
        </div>
      </div>
    );
  }

  const canModify = user && (user.id === post.authorId || ['admin', 'superadmin', 'moderator'].includes(user.role));

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <Link 
          href="/forum" 
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Forum
        </Link>
        <span className="text-muted-foreground">/</span>
        <Link 
          href={`/forum/category/${post.categorySlug}`}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {post.categoryName}
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-foreground truncate">{post.title}</span>
      </div>

      {/* Main Post */}
      <Card variant="glass" className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {post.pinned && (
                  <Badge variant="neon-orange">
                    <Pin className="w-3 h-3 mr-1" />
                    Pinned
                  </Badge>
                )}
                {post.locked && (
                  <Badge variant="secondary">
                    <Lock className="w-3 h-3 mr-1" />
                    Locked
                  </Badge>
                )}
              </div>
              <CardTitle className="text-2xl">{post.title}</CardTitle>
            </div>
            
            {canModify && (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={handleDeletePost}>
                  <Trash2 className="w-4 h-4 text-error" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Author Info */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
            <Avatar glow>
              <AvatarImage 
                src={getMinecraftAvatarUrl(post.authorMinecraft || post.authorUsername)} 
                alt={post.authorUsername} 
              />
              <AvatarFallback>{getInitials(post.authorUsername)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{post.authorUsername}</span>
                <Badge variant={
                  post.authorRole === 'admin' ? 'neon-pink' : 
                  post.authorRole === 'moderator' ? 'neon-purple' : 'secondary'
                }>
                  {post.authorRole}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatRelativeTime(new Date(post.createdAt))}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {post.views} views
                </span>
              </div>
            </div>
          </div>

          {/* Post Content */}
          <div className="prose prose-invert max-w-none">
            <p className="whitespace-pre-wrap">{post.content}</p>
          </div>
        </CardContent>
      </Card>

      {/* Replies */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-neon-cyan" />
          Replies ({replies.length})
        </h3>

        {replies.map((reply) => (
          <Card key={reply.id} variant="default">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar>
                  <AvatarImage 
                    src={getMinecraftAvatarUrl(reply.authorMinecraft || reply.authorUsername)} 
                    alt={reply.authorUsername} 
                  />
                  <AvatarFallback>{getInitials(reply.authorUsername)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">{reply.authorUsername}</span>
                    <Badge variant="secondary" className="text-xs">
                      {reply.authorRole}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatRelativeTime(new Date(reply.createdAt))}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{reply.content}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Reply Form */}
        {!post.locked && session ? (
          <Card variant="glass">
            <CardContent className="p-4">
              <form onSubmit={handleSubmitReply}>
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="w-full min-h-[120px] p-3 rounded-lg bg-secondary/50 border border-border focus:outline-none focus:ring-2 focus:ring-neon-cyan resize-none"
                />
                <div className="flex justify-end mt-3">
                  <Button type="submit" variant="gradient" disabled={isSubmitting || !replyContent.trim()}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Posting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Post Reply
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : post.locked ? (
          <Card variant="glass">
            <CardContent className="p-4 text-center text-muted-foreground">
              <Lock className="w-6 h-6 mx-auto mb-2" />
              <p>This post is locked and cannot receive new replies.</p>
            </CardContent>
          </Card>
        ) : (
          <Card variant="glass">
            <CardContent className="p-4 text-center">
              <p className="text-muted-foreground mb-3">Sign in to reply to this post</p>
              <Link href="/login">
                <Button variant="neon">Sign In</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
