'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Send, Loader2, AlertCircle, User, Calendar, Clock,
    MessageSquare, Flag, CheckCircle, Archive, Tag, Mail, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    open: { label: 'Open', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
    in_progress: { label: 'In Progress', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Loader2 },
    waiting: { label: 'Waiting for Reply', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
    resolved: { label: 'Resolved', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: CheckCircle },
    closed: { label: 'Closed', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: Archive },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
    low: { label: 'Low', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
    normal: { label: 'Normal', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    high: { label: 'High', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    urgent: { label: 'Urgent', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

function formatRelativeTime(date: string | Date) {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return then.toLocaleDateString();
}

function GuestTicketContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams?.get('token') || null;

    const [ticket, setTicket] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [replyMessage, setReplyMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // For resend access flow
    const [showResendForm, setShowResendForm] = useState(false);
    const [resendEmail, setResendEmail] = useState('');
    const [resendLoading, setResendLoading] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);

    useEffect(() => {
        if (token) {
            fetchTicket();
        } else {
            setLoading(false);
        }
    }, [token]);

    const fetchTicket = async () => {
        try {
            const res = await fetch(`/api/tickets/guest?token=${token}`);
            if (res.ok) {
                const data = await res.json();
                setTicket(data.ticket);
                setMessages(data.messages);
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to load ticket');
            }
        } catch (err: any) {
            setError('Failed to load ticket');
        } finally {
            setLoading(false);
        }
    };

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyMessage.trim() || !token) return;

        setIsSubmitting(true);
        setError('');

        try {
            const res = await fetch(`/api/tickets/guest/${ticket.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: replyMessage, token }),
            });

            if (res.ok) {
                const data = await res.json();
                setMessages([...messages, data.message]);
                setReplyMessage('');
                // Refresh ticket to get updated status
                fetchTicket();
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to send reply');
            }
        } catch (err: any) {
            setError('Failed to send reply');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResendAccess = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resendEmail.trim()) return;

        setResendLoading(true);
        try {
            const res = await fetch('/api/tickets/guest/resend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resendEmail }),
            });

            if (res.ok) {
                setResendSuccess(true);
            } else {
                setError('Failed to resend access email');
            }
        } catch (err: any) {
            setError('Failed to resend access email');
        } finally {
            setResendLoading(false);
        }
    };

    // No token provided - show access form
    if (!token && !loading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="border-b border-border bg-card/50 backdrop-blur-sm">
                    <div className="container mx-auto px-4 py-4">
                        <div className="flex items-center gap-4">
                            <Link href="/helpdesk">
                                <Button variant="ghost" size="sm" className="gap-2">
                                    <ArrowLeft className="w-4 h-4" />
                                    Back
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold gradient-text">Guest Ticket Access</h1>
                                <p className="text-sm text-muted-foreground">
                                    Enter your email to access your ticket
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-4 py-8 max-w-md">
                    <Card variant="glass">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Mail className="w-5 h-5 text-neon-cyan" />
                                Request Access Link
                            </CardTitle>
                            <CardDescription>
                                Enter the email you used to create your ticket and we'll send you a new access link.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {resendSuccess ? (
                                <div className="text-center py-8">
                                    <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
                                    <h3 className="text-xl font-bold mb-2">Check Your Email!</h3>
                                    <p className="text-muted-foreground">
                                        If a ticket exists for this email, we've sent you a new access link.
                                    </p>
                                </div>
                            ) : (
                                <form onSubmit={handleResendAccess} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="your@email.com"
                                            value={resendEmail}
                                            onChange={(e) => setResendEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <Button type="submit" variant="neon" className="w-full gap-2" disabled={resendLoading}>
                                        {resendLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-4 h-4" />
                                                Send Access Link
                                            </>
                                        )}
                                    </Button>
                                </form>
                            )}
                        </CardContent>
                    </Card>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-muted-foreground mb-2">Don't have a ticket yet?</p>
                        <Link href="/helpdesk/guest/new">
                            <Button variant="outline">Create Guest Ticket</Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
            </div>
        );
    }

    if (error && !ticket) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
                    <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                    <p className="text-muted-foreground mb-6">{error}</p>
                    <div className="flex gap-4 justify-center">
                        <Link href="/helpdesk">
                            <Button variant="neon">Back to Help Desk</Button>
                        </Link>
                        <Button variant="outline" onClick={() => setShowResendForm(true)}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Get New Access Link
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (!ticket) return null;

    const status = statusConfig[ticket.status] || statusConfig.open;
    const priority = priorityConfig[ticket.priority] || priorityConfig.normal;
    const StatusIcon = status.icon;
    const isClosed = ticket.status === 'closed' || ticket.status === 'resolved';

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/helpdesk">
                                <Button variant="ghost" size="sm" className="gap-2">
                                    <ArrowLeft className="w-4 h-4" />
                                    Back
                                </Button>
                            </Link>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-bold">Ticket #{ticket.id}</h1>
                                    <Badge className={status.color}>
                                        <StatusIcon className="w-3 h-3 mr-1" />
                                        {status.label}
                                    </Badge>
                                    <Badge className={priority.color}>
                                        <Flag className="w-3 h-3 mr-1" />
                                        {priority.label}
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">{ticket.subject}</p>
                            </div>
                        </div>
                        <Badge variant="outline" className="gap-1">
                            <User className="w-3 h-3" />
                            Guest: {ticket.guestName}
                        </Badge>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Messages */}
                        <Card variant="glass">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5" />
                                    Conversation ({messages.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {messages.map((msg: any) => (
                                    <div
                                        key={msg.id}
                                        className={`p-4 rounded-lg border ${msg.isStaffReply
                                            ? 'bg-neon-cyan/5 border-neon-cyan/30'
                                            : 'bg-secondary/50 border-border'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-2 rounded-lg ${msg.isStaffReply ? 'bg-neon-cyan/20' : 'bg-secondary'}`}>
                                                    <User className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{msg.guestName || 'Staff'}</p>
                                                    {msg.isStaffReply && (
                                                        <Badge className="bg-neon-cyan/20 text-neon-cyan text-xs">
                                                            Staff
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Calendar className="w-3 h-3" />
                                                {formatRelativeTime(msg.createdAt)}
                                            </div>
                                        </div>
                                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Reply Form */}
                        {!isClosed && (
                            <Card variant="glass">
                                <CardHeader>
                                    <CardTitle>Add Reply</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleReply} className="space-y-4">
                                        {error && (
                                            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3">
                                                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                                <p className="text-sm text-red-400">{error}</p>
                                            </div>
                                        )}
                                        <Textarea
                                            placeholder="Type your reply..."
                                            value={replyMessage}
                                            onChange={(e) => setReplyMessage(e.target.value)}
                                            rows={4}
                                            maxLength={5000}
                                        />
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-muted-foreground">
                                                {replyMessage.length}/5000 characters
                                            </p>
                                            <Button
                                                type="submit"
                                                variant="neon"
                                                disabled={isSubmitting || !replyMessage.trim()}
                                                className="gap-2"
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Sending...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Send className="w-4 h-4" />
                                                        Send Reply
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        )}

                        {isClosed && (
                            <Card variant="glass" className="border-yellow-500/30">
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-3">
                                        <Archive className="w-5 h-5 text-yellow-400" />
                                        <p className="text-sm text-muted-foreground">
                                            This ticket is {ticket.status}. You cannot add new replies.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <Card variant="glass">
                            <CardHeader>
                                <CardTitle className="text-lg">Ticket Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Guest Name</p>
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4" />
                                        <p className="font-medium">{ticket.guestName}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Email</p>
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4" />
                                        <p className="font-medium">{ticket.guestEmail}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Category</p>
                                    <Badge variant="outline" className="gap-1">
                                        <Tag className="w-3 h-3" />
                                        {ticket.category}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Created</p>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="w-4 h-4" />
                                        {formatRelativeTime(ticket.createdAt)}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Clock className="w-4 h-4" />
                                        {formatRelativeTime(ticket.updatedAt)}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function GuestTicketPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
            </div>
        }>
            <GuestTicketContent />
        </Suspense>
    );
}
