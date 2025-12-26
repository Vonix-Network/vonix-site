'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    MessageSquare, Eye, Clock,
    Pin, Lock, Trash2, Send, Loader2, Edit2, X, Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { RankBadge, RoleBadge } from '@/components/rank-badge';
import { getMinecraftAvatarUrl, getInitials, formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';
import { MarkdownEditor, MarkdownContent } from '@/components/markdown-editor';
import { Input } from '@/components/ui/input';

export interface ForumPost {
    id: number;
    title: string;
    content: string;
    createdAt: Date | string;
    views: number;
    pinned: boolean;
    locked: boolean;
    authorId: number;
    authorUsername: string | null;
    authorMinecraft: string | null;
    authorRole: string | null;
    authorRankId: number | null;
    authorRankExpiresAt: Date | string | null;
    rankName: string | null;
    rankColor: string | null;
    categoryId: number | null;
    categoryName: string | null;
    categorySlug: string | null;
}

export interface ForumReply {
    id: number;
    content: string;
    createdAt: Date | string;
    authorId: number;
    authorUsername: string | null;
    authorMinecraft: string | null;
    authorRole: string | null;
    authorRankId: number | null;
    authorRankExpiresAt: Date | string | null;
    rankName: string | null;
    rankColor: string | null;
}

interface ForumPostClientProps {
    post: ForumPost;
    replies: ForumReply[];
}

export function ForumPostClient({ post: initialPost, replies: initialReplies }: ForumPostClientProps) {
    const { data: session } = useSession();
    const router = useRouter();

    const [post, setPost] = useState<ForumPost>(initialPost);
    const [replies, setReplies] = useState<ForumReply[]>(initialReplies);
    const [replyContent, setReplyContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit states
    const [isEditingPost, setIsEditingPost] = useState(false);
    const [editPostTitle, setEditPostTitle] = useState(post.title);
    const [editPostContent, setEditPostContent] = useState(post.content);
    const [editingReplyId, setEditingReplyId] = useState<number | null>(null);
    const [editReplyContent, setEditReplyContent] = useState('');

    const user = session?.user as any;
    const isAdmin = user && ['admin', 'superadmin', 'moderator'].includes(user.role);
    const canModifyPost = user && (user.id === post.authorId || isAdmin);

    const canModifyReply = (reply: ForumReply) => {
        return user && (user.id === reply.authorId || isAdmin);
    };

    // Handle new reply submission
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
            const res = await fetch(`/api/forum/posts/${post.id}/replies`, {
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
        } catch (error: any) {
            console.error('Failed to post reply:', error);
            toast.error('Failed to post reply');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Edit post
    const handleEditPost = async () => {
        if (!editPostTitle.trim() || !editPostContent.trim()) {
            toast.error('Title and content are required');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/forum/posts/${post.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: editPostTitle, content: editPostContent }),
            });

            if (res.ok) {
                const data = await res.json();
                setPost({ ...post, title: data.post.title, content: data.post.content });
                setIsEditingPost(false);
                toast.success('Post updated!');
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to update post');
            }
        } catch (error: any) {
            console.error('Failed to update post:', error);
            toast.error('Failed to update post');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete post
    const handleDeletePost = async () => {
        if (!confirm('Are you sure you want to delete this post? This cannot be undone.')) return;

        try {
            const res = await fetch(`/api/forum/posts/${post.id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Post deleted');
                router.push('/forum');
                router.refresh();
            } else {
                toast.error('Failed to delete post');
            }
        } catch (error: any) {
            console.error('Failed to delete post:', error);
            toast.error('Failed to delete post');
        }
    };

    // Edit reply
    const handleStartEditReply = (reply: ForumReply) => {
        setEditingReplyId(reply.id);
        setEditReplyContent(reply.content);
    };

    const handleCancelEditReply = () => {
        setEditingReplyId(null);
        setEditReplyContent('');
    };

    const handleSaveEditReply = async (replyId: number) => {
        if (!editReplyContent.trim()) {
            toast.error('Reply cannot be empty');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/forum/posts/${post.id}/replies/${replyId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: editReplyContent }),
            });

            if (res.ok) {
                setReplies(replies.map((r: any) => r.id === replyId ? { ...r, content: editReplyContent } : r));
                setEditingReplyId(null);
                setEditReplyContent('');
                toast.success('Reply updated!');
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to update reply');
            }
        } catch (error: any) {
            console.error('Failed to update reply:', error);
            toast.error('Failed to update reply');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete reply
    const handleDeleteReply = async (replyId: number) => {
        if (!confirm('Are you sure you want to delete this reply?')) return;

        try {
            const res = await fetch(`/api/forum/posts/${post.id}/replies/${replyId}`, { method: 'DELETE' });
            if (res.ok) {
                setReplies(replies.filter((r: any) => r.id !== replyId));
                toast.success('Reply deleted');
            } else {
                toast.error('Failed to delete reply');
            }
        } catch (error: any) {
            console.error('Failed to delete reply:', error);
            toast.error('Failed to delete reply');
        }
    };

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
                            {isEditingPost ? (
                                <Input
                                    value={editPostTitle}
                                    onChange={(e) => setEditPostTitle(e.target.value)}
                                    className="text-2xl font-bold mb-2"
                                    placeholder="Post title"
                                />
                            ) : (
                                <CardTitle className="text-2xl">{post.title}</CardTitle>
                            )}
                        </div>

                        {canModifyPost && !isEditingPost && (
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={() => setIsEditingPost(true)}>
                                    <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={handleDeletePost}>
                                    <Trash2 className="w-4 h-4 text-error" />
                                </Button>
                            </div>
                        )}

                        {isEditingPost && (
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={() => setIsEditingPost(false)} disabled={isSubmitting}>
                                    <X className="w-4 h-4" />
                                </Button>
                                <Button variant="neon" size="icon" onClick={handleEditPost} disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
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
                                src={getMinecraftAvatarUrl(post.authorMinecraft || post.authorUsername || 'Steve')}
                                alt={post.authorUsername || 'User'}
                            />
                            <AvatarFallback>{getInitials(post.authorUsername || 'User')}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">{post.authorUsername}</span>
                                {post.authorRole && post.authorRole !== 'user' && (
                                    <RoleBadge role={post.authorRole} size="sm" />
                                )}
                                {post.authorRankId && post.authorRankExpiresAt && new Date(post.authorRankExpiresAt) > new Date() && (
                                    <RankBadge
                                        rank={{
                                            name: post.rankName || 'Supporter',
                                            color: post.rankColor || '#00D9FF',
                                        }}
                                        size="sm"
                                    />
                                )}
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
                    {isEditingPost ? (
                        <MarkdownEditor
                            value={editPostContent}
                            onChange={setEditPostContent}
                            minHeight="200px"
                            maxLength={10000}
                        />
                    ) : (
                        <MarkdownContent content={post.content} />
                    )}
                </CardContent>
            </Card>

            {/* Replies */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-neon-cyan" />
                    Replies ({replies.length})
                </h3>

                {replies.map((reply: any) => (
                    <Card key={reply.id} variant="default">
                        <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                                <Avatar>
                                    <AvatarImage
                                        src={getMinecraftAvatarUrl(reply.authorMinecraft || reply.authorUsername || 'Steve')}
                                        alt={reply.authorUsername || 'User'}
                                    />
                                    <AvatarFallback>{getInitials(reply.authorUsername || 'User')}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium">{reply.authorUsername}</span>
                                            {reply.authorRole && reply.authorRole !== 'user' && (
                                                <RoleBadge role={reply.authorRole} size="sm" />
                                            )}
                                            {reply.authorRankId && reply.authorRankExpiresAt && new Date(reply.authorRankExpiresAt) > new Date() && (
                                                <RankBadge
                                                    rank={{
                                                        name: reply.rankName || 'Supporter',
                                                        color: reply.rankColor || '#00D9FF',
                                                    }}
                                                    size="sm"
                                                />
                                            )}
                                            <span className="text-sm text-muted-foreground">
                                                {formatRelativeTime(new Date(reply.createdAt))}
                                            </span>
                                        </div>

                                        {/* Reply actions */}
                                        {canModifyReply(reply) && editingReplyId !== reply.id && (
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => handleStartEditReply(reply)}>
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => handleDeleteReply(reply.id)}>
                                                    <Trash2 className="w-3.5 h-3.5 text-error" />
                                                </Button>
                                            </div>
                                        )}

                                        {editingReplyId === reply.id && (
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="icon" className="w-7 h-7" onClick={handleCancelEditReply} disabled={isSubmitting}>
                                                    <X className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button variant="neon" size="icon" className="w-7 h-7" onClick={() => handleSaveEditReply(reply.id)} disabled={isSubmitting}>
                                                    {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {editingReplyId === reply.id ? (
                                        <MarkdownEditor
                                            value={editReplyContent}
                                            onChange={setEditReplyContent}
                                            minHeight="100px"
                                            maxLength={5000}
                                        />
                                    ) : (
                                        <MarkdownContent content={reply.content} />
                                    )}
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
                                <MarkdownEditor
                                    value={replyContent}
                                    onChange={setReplyContent}
                                    placeholder="Write a reply... (Markdown supported)"
                                    minHeight="120px"
                                    maxLength={5000}
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
