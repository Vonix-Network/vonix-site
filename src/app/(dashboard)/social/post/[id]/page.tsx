'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { 
  Heart, MessageCircle, Share2, ArrowLeft, Send,
  Loader2, MoreHorizontal, Trash2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getMinecraftAvatarUrl, getInitials, formatRelativeTime } from '@/lib/utils';

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  userId: number;
  username: string | null;
  minecraftUsername: string | null;
  userRole: string | null;
}

interface Post {
  id: number;
  content: string;
  imageUrl: string | null;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  userId: number;
  username: string | null;
  minecraftUsername: string | null;
  userRole: string | null;
  comments: Comment[];
  userLiked: boolean;
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as any;

  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  const fetchPost = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`/api/social/posts/${params.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError('Post not found');
        } else {
          throw new Error('Failed to fetch post');
        }
        return;
      }
      const data = await response.json();
      setPost(data);
    } catch (err) {
      console.error('Error fetching post:', err);
      setError('Failed to load post');
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const handleLike = async () => {
    if (!session) {
      toast.warning('Please sign in to like posts');
      return;
    }
    if (!post) return;

    // Prevent liking own post
    if (post.userId === parseInt(user?.id)) {
      toast.warning('You cannot like your own post');
      return;
    }

    setIsLiking(true);
    try {
      const response = await fetch(`/api/social/posts/${post.id}/like`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.selfLike) {
          toast.warning('You cannot like your own post');
        } else {
          throw new Error(data.error || 'Failed to like post');
        }
        return;
      }

      // Update post state
      setPost({
        ...post,
        userLiked: data.liked,
        likesCount: data.liked ? post.likesCount + 1 : post.likesCount - 1,
      });

      toast.success(data.liked ? 'Post liked!' : 'Like removed');
    } catch (err) {
      toast.error('Failed to update like');
    } finally {
      setIsLiking(false);
    }
  };

  const handleComment = async () => {
    if (!newComment.trim() || !post) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/social/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to post comment');
      }

      // Refresh to get updated comments
      await fetchPost();
      setNewComment('');
      toast.success('Comment posted!');
    } catch (err) {
      toast.error('Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!post || !confirm('Are you sure you want to delete this post?')) return;

    try {
      const response = await fetch(`/api/social/posts/${post.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete post');
      }

      toast.success('Post deleted');
      router.push('/social');
    } catch (err) {
      toast.error('Failed to delete post');
    }
  };

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case 'admin':
      case 'superadmin':
        return <Badge variant="neon-pink">Admin</Badge>;
      case 'moderator':
        return <Badge variant="neon-purple">Mod</Badge>;
      default:
        return null;
    }
  };

  const canDelete = post && user && (
    post.userId === parseInt(user.id) ||
    ['admin', 'superadmin', 'moderator'].includes(user.role)
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-neon-cyan" />
          <p className="text-muted-foreground">Loading post...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card variant="glass" className="text-center py-12">
          <CardContent>
            <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-bold mb-2">{error || 'Post not found'}</h3>
            <p className="text-muted-foreground mb-4">
              This post may have been deleted or doesn't exist.
            </p>
            <Button variant="neon" onClick={() => router.push('/social')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Feed
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Back Button */}
      <Link 
        href="/social" 
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Feed
      </Link>

      {/* Main Post */}
      <Card variant="glass" className="mb-6">
        <CardContent className="p-6">
          {/* Post Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12" glow>
                <AvatarImage 
                  src={getMinecraftAvatarUrl(post.minecraftUsername || post.username || '')} 
                  alt={post.username || ''} 
                />
                <AvatarFallback>
                  {getInitials(post.username || 'U')}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg">{post.username}</span>
                  {getRoleBadge(post.userRole)}
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatRelativeTime(new Date(post.createdAt))}
                </span>
              </div>
            </div>
            
            {canDelete && (
              <Button variant="ghost" size="icon" onClick={handleDelete} className="text-error hover:text-error">
                <Trash2 className="w-5 h-5" />
              </Button>
            )}
          </div>

          {/* Post Content */}
          <p className="text-foreground text-lg mb-6 whitespace-pre-wrap">
            {post.content}
          </p>

          {/* Post Image */}
          {post.imageUrl && (
            <div className="mb-6 rounded-lg overflow-hidden">
              <img 
                src={post.imageUrl} 
                alt="Post image" 
                className="w-full object-cover"
              />
            </div>
          )}

          {/* Post Actions */}
          <div className="flex items-center gap-6 pt-4 border-t border-border">
            <button
              onClick={handleLike}
              disabled={isLiking}
              className={`flex items-center gap-2 transition-colors ${
                post.userLiked ? 'text-error' : 'text-muted-foreground hover:text-error'
              }`}
            >
              <Heart className={`w-6 h-6 ${post.userLiked ? 'fill-current' : ''}`} />
              <span>{post.likesCount}</span>
            </button>
            
            <div className="flex items-center gap-2 text-muted-foreground">
              <MessageCircle className="w-6 h-6" />
              <span>{post.commentsCount}</span>
            </div>
            
            <button className="flex items-center gap-2 text-muted-foreground hover:text-neon-purple transition-colors">
              <Share2 className="w-6 h-6" />
              <span>Share</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Comment Input */}
      {session && (
        <Card variant="glass" className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage 
                  src={getMinecraftAvatarUrl(user?.minecraftUsername || user?.username || '')} 
                  alt={user?.username} 
                />
                <AvatarFallback>
                  {getInitials(user?.username || 'U')}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="w-full bg-secondary/50 border border-border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 min-h-[80px]"
                  maxLength={500}
                />
                
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">
                    {newComment.length}/500
                  </span>
                  <Button 
                    variant="neon" 
                    size="sm"
                    onClick={handleComment}
                    disabled={!newComment.trim() || isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Comment
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comments */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Comments ({post.comments.length})</h3>
        
        {post.comments.length === 0 ? (
          <Card variant="glass">
            <CardContent className="text-center py-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No comments yet. Be the first to comment!</p>
            </CardContent>
          </Card>
        ) : (
          post.comments.map((comment) => (
            <Card key={comment.id} variant="glass">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage 
                      src={getMinecraftAvatarUrl(comment.minecraftUsername || comment.username || '')} 
                      alt={comment.username || ''} 
                    />
                    <AvatarFallback>
                      {getInitials(comment.username || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{comment.username}</span>
                      {getRoleBadge(comment.userRole)}
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeTime(new Date(comment.createdAt))}
                      </span>
                    </div>
                    <p className="text-foreground whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
