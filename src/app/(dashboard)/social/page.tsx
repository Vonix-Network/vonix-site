'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { toast } from 'sonner';
import { 
  Heart, MessageCircle, Share2, MoreHorizontal,
  Image as ImageIcon, Send, Loader2, Sparkles, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getMinecraftAvatarUrl, getInitials, formatRelativeTime } from '@/lib/utils';

interface SocialPost {
  id: number;
  userId: number;
  user: { username: string; minecraftUsername: string | null; role: string };
  content: string;
  imageUrl: string | null;
  likesCount: number;
  commentsCount: number;
  createdAt: Date;
  liked: boolean;
}

interface APIPost {
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
}

export default function SocialPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [newPost, setNewPost] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch posts from API
  const fetchPosts = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/social/posts?limit=50');
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      const data: APIPost[] = await response.json();
      
      // Transform API response to match component interface
      const transformedPosts: SocialPost[] = data.map(post => ({
        id: post.id,
        userId: post.userId,
        user: {
          username: post.username || 'Unknown',
          minecraftUsername: post.minecraftUsername,
          role: post.userRole || 'user',
        },
        content: post.content,
        imageUrl: post.imageUrl,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        createdAt: new Date(post.createdAt),
        liked: false, // Will be updated by like status check
      }));
      
      setPosts(transformedPosts);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to load posts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load posts on mount
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handlePost = async () => {
    if (!newPost.trim()) return;
    
    setIsPosting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newPost.trim() }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create post');
      }
      
      // Refresh posts to get the new one with proper user data
      await fetchPosts();
      setNewPost('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };

  const handleLike = async (postId: number) => {
    if (!session) {
      toast.warning('Please sign in to like posts');
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    // Prevent liking own post
    if (post.userId === parseInt(user?.id)) {
      toast.warning('You cannot like your own post');
      return;
    }

    try {
      const response = await fetch(`/api/social/posts/${postId}/like`, {
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

      // Update local state
      setPosts(posts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            liked: data.liked,
            likesCount: data.liked ? p.likesCount + 1 : p.likesCount - 1,
          };
        }
        return p;
      }));

      toast.success(data.liked ? 'Post liked!' : 'Like removed');
    } catch (err) {
      toast.error('Failed to update like');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="neon-pink">Admin</Badge>;
      case 'moderator':
        return <Badge variant="neon-purple">Mod</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold gradient-text mb-2">
          Social Feed
        </h1>
        <p className="text-muted-foreground">
          Share updates and connect with the community
        </p>
      </div>

      {/* Create Post */}
      {session && (
        <Card variant="glass" className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Avatar className="w-10 h-10" glow>
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
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="What's on your mind?"
                  className="w-full bg-secondary/50 border border-border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 min-h-[80px]"
                  maxLength={500}
                />
                
                <div className="flex items-center justify-between mt-3">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" disabled>
                      <ImageIcon className="w-5 h-5 text-muted-foreground" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {newPost.length}/500
                    </span>
                    <Button 
                      variant="gradient" 
                      onClick={handlePost}
                      disabled={!newPost.trim() || isPosting}
                    >
                      {isPosting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Post
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 rounded-lg bg-error/10 border border-error/30 text-error text-center">
          {error}
          <Button variant="ghost" size="sm" className="ml-2" onClick={fetchPosts}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Retry
          </Button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-neon-cyan" />
          <p className="text-muted-foreground">Loading posts...</p>
        </div>
      )}

      {/* Posts Feed */}
      {!isLoading && (
      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post.id} variant="glass" hover>
            <CardContent className="p-4">
              {/* Post Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage 
                      src={getMinecraftAvatarUrl(post.user.minecraftUsername || post.user.username)} 
                      alt={post.user.username} 
                    />
                    <AvatarFallback>
                      {getInitials(post.user.username)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{post.user.username}</span>
                      {getRoleBadge(post.user.role)}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatRelativeTime(post.createdAt)}
                    </span>
                  </div>
                </div>
                
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </div>

              {/* Post Content */}
              <p className="text-foreground mb-4 whitespace-pre-wrap">
                {post.content}
              </p>

              {/* Post Image */}
              {post.imageUrl && (
                <div className="mb-4 rounded-lg overflow-hidden">
                  <img 
                    src={post.imageUrl} 
                    alt="Post image" 
                    className="w-full object-cover"
                  />
                </div>
              )}

              {/* Post Actions */}
              <div className="flex items-center gap-6 pt-3 border-t border-border">
                <button
                  onClick={() => handleLike(post.id)}
                  className={`flex items-center gap-2 transition-colors ${
                    post.liked ? 'text-error' : 'text-muted-foreground hover:text-error'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${post.liked ? 'fill-current' : ''}`} />
                  <span className="text-sm">{post.likesCount}</span>
                </button>
                
                <Link 
                  href={`/social/post/${post.id}`}
                  className="flex items-center gap-2 text-muted-foreground hover:text-neon-cyan transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm">{post.commentsCount}</span>
                </Link>
                
                <button className="flex items-center gap-2 text-muted-foreground hover:text-neon-purple transition-colors">
                  <Share2 className="w-5 h-5" />
                  <span className="text-sm">Share</span>
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      {/* Empty State */}
      {!isLoading && posts.length === 0 && (
        <Card variant="glass" className="text-center py-12">
          <CardContent>
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-neon-purple" />
            <h3 className="text-xl font-bold mb-2">No posts yet</h3>
            <p className="text-muted-foreground mb-4">
              Be the first to share something with the community!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
