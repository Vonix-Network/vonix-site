'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Heart, MessageCircle, Share2, MoreHorizontal,
  Image as ImageIcon, Send, Loader2, Sparkles, RefreshCw,
  Trash2, Edit, Flag, Copy, TrendingUp, Users, Activity,
  Flame, Clock, ChevronDown, X, AlertTriangle
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

type FeedFilter = 'latest' | 'trending' | 'following';

export default function SocialPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [newPost, setNewPost] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('latest');
  const [showDeleteModal, setShowDeleteModal] = useState<number | null>(null);
  const [stats, setStats] = useState({ totalPosts: 0, totalUsers: 0, postsToday: 0 });

  // Check if current user can manage a post
  const canManagePost = (post: SocialPost) => {
    if (!session?.user) return false;
    const userId = parseInt(user?.id);
    const userRole = user?.role;
    return post.userId === userId || ['admin', 'superadmin', 'moderator'].includes(userRole);
  };

  const isOwnPost = (post: SocialPost) => {
    if (!session?.user) return false;
    return post.userId === parseInt(user?.id);
  };

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
      const transformedPosts: SocialPost[] = data.map((post: any) => ({
        id: post.id,
        userId: post.userId,
        user: {
          username: post.username || 'Unknown',
          minecraftUsername: post.minecraftUsername,
          role: post.userRole || 'user',
        },
        content: post.content,
        imageUrl: post.imageUrl,
        likesCount: Number(post.likesCount) || 0,
        commentsCount: Number(post.commentsCount) || 0,
        createdAt: new Date(post.createdAt),
        liked: false,
      }));

      setPosts(transformedPosts);

      // Calculate stats
      const uniqueUsers = new Set(transformedPosts.map(p => p.userId)).size;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const postsToday = transformedPosts.filter(p => new Date(p.createdAt) >= today).length;
      setStats({
        totalPosts: transformedPosts.length,
        totalUsers: uniqueUsers,
        postsToday,
      });
    } catch (err: any) {
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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

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
      toast.success('Post created!');
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
      toast.error('Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeletePost = async (postId: number) => {
    setDeletingPostId(postId);
    try {
      const response = await fetch(`/api/social/posts/${postId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete post');
      }

      // Remove from local state
      setPosts(posts.filter(p => p.id !== postId));
      toast.success('Post deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete post');
    } finally {
      setDeletingPostId(null);
      setShowDeleteModal(null);
    }
  };

  const handleCopyLink = (postId: number) => {
    const url = `${window.location.origin}/social/post/${postId}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
    setOpenMenuId(null);
  };

  const handleLike = async (postId: number) => {
    if (!session) {
      toast.warning('Please sign in to like posts');
      return;
    }

    const post = posts.find((p: any) => p.id === postId);
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
      setPosts(posts.map((p: any) => {
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
    } catch (err: any) {
      toast.error('Failed to update like');
    }
  };

  const getRoleBadge = (role: string) => {
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

  // Sort posts based on filter
  const filteredPosts = [...posts].sort((a, b) => {
    switch (feedFilter) {
      case 'trending':
        return b.likesCount - a.likesCount;
      case 'latest':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Stats */}
        <div className="hidden lg:block space-y-4">
          <Card variant="glass">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-neon-cyan" />
                Community Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Posts</span>
                <span className="font-bold text-neon-cyan">{stats.totalPosts}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Active Users</span>
                <span className="font-bold text-neon-purple">{stats.totalUsers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Posts Today</span>
                <span className="font-bold text-neon-orange">{stats.postsToday}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card variant="glass">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/forum" className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                <MessageCircle className="w-4 h-4 text-neon-cyan" />
                <span>Forum</span>
              </Link>
              <Link href="/leaderboard" className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                <TrendingUp className="w-4 h-4 text-neon-purple" />
                <span>Leaderboard</span>
              </Link>
              <Link href="/users" className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                <Users className="w-4 h-4 text-neon-orange" />
                <span>Members</span>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Main Feed */}
        <div className="lg:col-span-2 max-w-2xl mx-auto w-full">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold gradient-text mb-2">
              Social Feed
            </h1>
            <p className="text-muted-foreground">
              Share updates and connect with the community
            </p>
          </div>

          {/* Feed Filter */}
          <div className="flex items-center gap-2 mb-4 bg-secondary/30 rounded-lg p-1 w-fit mx-auto">
            <button
              onClick={() => setFeedFilter('latest')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${feedFilter === 'latest'
                  ? 'bg-neon-cyan text-white'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <Clock className="w-4 h-4" />
              Latest
            </button>
            <button
              onClick={() => setFeedFilter('trending')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${feedFilter === 'trending'
                  ? 'bg-neon-orange text-white'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <Flame className="w-4 h-4" />
              Trending
            </button>
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
                        <Button variant="ghost" size="icon" disabled title="Image upload coming soon">
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

          {/* Not Signed In Prompt */}
          {!session && (
            <Card variant="glass" className="mb-6 text-center py-6">
              <CardContent>
                <p className="text-muted-foreground mb-4">Sign in to share posts with the community</p>
                <Link href="/login">
                  <Button variant="gradient">Sign In</Button>
                </Link>
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
              {filteredPosts.map((post: any) => (
                <Card key={post.id} variant="glass" hover>
                  <CardContent className="p-4">
                    {/* Post Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Link href={`/profile/${post.user.username}`}>
                          <Avatar className="w-10 h-10 hover:ring-2 hover:ring-neon-cyan transition-all">
                            <AvatarImage
                              src={getMinecraftAvatarUrl(post.user.minecraftUsername || post.user.username)}
                              alt={post.user.username}
                            />
                            <AvatarFallback>
                              {getInitials(post.user.username)}
                            </AvatarFallback>
                          </Avatar>
                        </Link>

                        <div>
                          <div className="flex items-center gap-2">
                            <Link href={`/profile/${post.user.username}`} className="font-semibold hover:text-neon-cyan transition-colors">
                              {post.user.username}
                            </Link>
                            {getRoleBadge(post.user.role)}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatRelativeTime(post.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Post Menu */}
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === post.id ? null : post.id);
                          }}
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </Button>

                        {/* Dropdown Menu */}
                        {openMenuId === post.id && (
                          <div
                            className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-50 py-1 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleCopyLink(post.id)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary/50 transition-colors"
                            >
                              <Copy className="w-4 h-4" />
                              Copy Link
                            </button>

                            <Link
                              href={`/social/post/${post.id}`}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary/50 transition-colors"
                            >
                              <MessageCircle className="w-4 h-4" />
                              View Post
                            </Link>

                            {canManagePost(post) && (
                              <>
                                <div className="border-t border-border my-1" />
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setShowDeleteModal(post.id);
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-error hover:bg-error/10 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  {isOwnPost(post) ? 'Delete Post' : 'Remove Post (Mod)'}
                                </button>
                              </>
                            )}

                            {!isOwnPost(post) && session && (
                              <>
                                <div className="border-t border-border my-1" />
                                <button
                                  onClick={() => {
                                    toast.info('Report feature coming soon');
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-warning hover:bg-warning/10 transition-colors"
                                >
                                  <Flag className="w-4 h-4" />
                                  Report Post
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
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
                        className={`flex items-center gap-2 transition-colors ${post.liked ? 'text-error' : 'text-muted-foreground hover:text-error'
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

                      <button
                        onClick={() => handleCopyLink(post.id)}
                        className="flex items-center gap-2 text-muted-foreground hover:text-neon-purple transition-colors"
                      >
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

        {/* Right Sidebar - Top Contributors */}
        <div className="hidden lg:block space-y-4">
          <Card variant="glass">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-neon-orange" />
                Top Contributors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Get unique users sorted by post count */}
              {(() => {
                const userPostCounts = posts.reduce((acc: Record<string, { user: SocialPost['user']; count: number }>, post) => {
                  const key = post.user.username;
                  if (!acc[key]) {
                    acc[key] = { user: post.user, count: 0 };
                  }
                  acc[key].count++;
                  return acc;
                }, {});

                return Object.values(userPostCounts)
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 5)
                  .map((item, index) => (
                    <Link
                      key={item.user.username}
                      href={`/profile/${item.user.username}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                      <span className="text-lg font-bold text-muted-foreground w-6">
                        #{index + 1}
                      </span>
                      <Avatar className="w-8 h-8">
                        <AvatarImage
                          src={getMinecraftAvatarUrl(item.user.minecraftUsername || item.user.username)}
                          alt={item.user.username}
                        />
                        <AvatarFallback>
                          {getInitials(item.user.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.user.username}</p>
                        <p className="text-xs text-muted-foreground">{item.count} posts</p>
                      </div>
                    </Link>
                  ));
              })()}

              {posts.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No contributors yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Community Guidelines */}
          <Card variant="glass">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Community Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Be respectful to other members</p>
              <p>• No spam or self-promotion</p>
              <p>• Keep content appropriate</p>
              <p>• Have fun and enjoy!</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card variant="glass" className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-full bg-error/20">
                  <AlertTriangle className="w-6 h-6 text-error" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Delete Post?</h3>
                  <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setShowDeleteModal(null)}
                  disabled={deletingPostId !== null}
                >
                  Cancel
                </Button>
                <Button
                  variant="neon"
                  className="bg-error hover:bg-error/80"
                  onClick={() => handleDeletePost(showDeleteModal)}
                  disabled={deletingPostId !== null}
                >
                  {deletingPostId === showDeleteModal ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
