'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    MessageSquare, Eye, Clock,
    Pin, Lock, Trash2, Send, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { RankBadge, RoleBadge } from '@/components/rank-badge';
import { getMinecraftAvatarUrl, getInitials, formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';

export interface ForumPost {
    id: number;
    title: string;
    content: string;
    createdAt: Date | string;
    views: number;
    pinned: boolean; // boolean | null in DB but usually boolean in UI
    locked: boolean; // boolean | null
    authorId: number;
    authorUsername: string | null; // leftJoin might be null
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

    // We can treat initial data as static for now, but if we want to add new replies locally we need state
    const [replies, setReplies] = useState<ForumReply[]>(initialReplies);
    const [replyContent, setReplyContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const user = session?.user as any;

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
            const res = await fetch(`/api/forum/posts/${initialPost.id}/replies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: replyContent }),
            });

            if (res.ok) {
                const data = await res.json();
                // Append new reply
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
            const res = await fetch(`/api/forum/posts/${initialPost.id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Post deleted');
                router.push('/forum');
                router.refresh();
            } else {
                toast.error('Failed to delete post');
            }
        } catch (error) {
            console.error('Failed to delete post:', error);
            toast.error('Failed to delete post');
        }
    };

    const canModify = user && (user.id === initialPost.authorId || ['admin', 'superadmin', 'moderator'].includes(user.role));

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
                    href={`/forum/category/${initialPost.categorySlug}`}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                >
                    {initialPost.categoryName}
                </Link>
                <span className="text-muted-foreground">/</span>
                <span className="text-foreground truncate">{initialPost.title}</span>
            </div>

            {/* Main Post */}
            <Card variant="glass" className="mb-6">
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                {initialPost.pinned && (
                                    <Badge variant="neon-orange">
                                        <Pin className="w-3 h-3 mr-1" />
                                        Pinned
                                    </Badge>
                                )}
                                {initialPost.locked && (
                                    <Badge variant="secondary">
                                        <Lock className="w-3 h-3 mr-1" />
                                        Locked
                                    </Badge>
                                )}
                            </div>
                            <CardTitle className="text-2xl">{initialPost.title}</CardTitle>
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
                                src={getMinecraftAvatarUrl(initialPost.authorMinecraft || initialPost.authorUsername || 'Steve')}
                                alt={initialPost.authorUsername || 'User'}
                            />
                            <AvatarFallback>{getInitials(initialPost.authorUsername || 'User')}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">{initialPost.authorUsername}</span>
                                {initialPost.authorRole && initialPost.authorRole !== 'user' && (
                                    <RoleBadge role={initialPost.authorRole} size="sm" />
                                )}
                                {initialPost.authorRankId && initialPost.authorRankExpiresAt && new Date(initialPost.authorRankExpiresAt) > new Date() && (
                                    <RankBadge
                                        rank={{
                                            name: initialPost.rankName || 'Supporter',
                                            color: initialPost.rankColor || '#00D9FF',
                                        }}
                                        size="sm"
                                    />
                                )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatRelativeTime(new Date(initialPost.createdAt))}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Eye className="w-3 h-3" />
                                    {initialPost.views} views
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Post Content */}
                    <div className="prose prose-invert max-w-none">
                        <p className="whitespace-pre-wrap">{initialPost.content}</p>
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
                                        src={getMinecraftAvatarUrl(reply.authorMinecraft || reply.authorUsername || 'Steve')}
                                        alt={reply.authorUsername || 'User'}
                                    />
                                    <AvatarFallback>{getInitials(reply.authorUsername || 'User')}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
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
                                    <p className="whitespace-pre-wrap">{reply.content}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {/* Reply Form */}
                {!initialPost.locked && session ? (
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
                ) : initialPost.locked ? (
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
