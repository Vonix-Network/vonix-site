'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
    ArrowLeft, Send, Loader2, AlertCircle, Clock, CheckCircle,
    MessageSquare, User, Calendar, Tag, Flag, Archive
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime, getInitials } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface TicketMessage {
    id: number;
    message: string;
    isStaffReply: boolean;
    createdAt: string;
    username: string;
    avatarUrl?: string | null;
}

interface TicketData {
    id: number;
    subject: string;
    category: string;
    priority: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    closedAt: string | null;
    username: string;
    userId: number;
    messages: TicketMessage[];
}

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
    open: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: AlertCircle, label: 'Open' },
    in_progress: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock, label: 'In Progress' },
    waiting: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: MessageSquare, label: 'Waiting' },
    resolved: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle, label: 'Resolved' },
    closed: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: Archive, label: 'Closed' },
};

const priorityConfig: Record<string, { color: string; label: string }> = {
    low: { color: 'bg-gray-500/20 text-gray-400', label: 'Low' },
    normal: { color: 'bg-blue-500/20 text-blue-400', label: 'Normal' },
    high: { color: 'bg-orange-500/20 text-orange-400', label: 'High' },
    urgent: { color: 'bg-red-500/20 text-red-400 animate-pulse', label: 'Urgent' },
};

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const { data: session } = useSession();
    const [ticket, setTicket] = useState<TicketData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [replyMessage, setReplyMessage] = useState('');
    const [error, setError] = useState('');
    const [isStaff, setIsStaff] = useState(false);

    useEffect(() => {
        if (session) {
            const userRole = (session.user as any)?.role;
            setIsStaff(['admin', 'superadmin', 'moderator'].includes(userRole));
        }
        fetchTicket();
    }, [session]);

    const fetchTicket = async () => {
        try {
            const res = await fetch(`/api/tickets/${resolvedParams.id}`);
            if (res.ok) {
                const data = await res.json();
                // API returns { ticket, messages, isStaff } - merge messages into ticket
                setTicket({
                    ...data.ticket,
                    messages: data.messages || [],
                });
                if (data.isStaff !== undefined) {
                    setIsStaff(data.isStaff);
                }
            } else if (res.status === 403) {
                router.push('/helpdesk');
            }
        } catch (error) {
            console.error('Error fetching ticket:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyMessage.trim()) return;

        setError('');
        setIsSubmitting(true);

        try {
            const res = await fetch(`/api/tickets/${resolvedParams.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: replyMessage }),
            });

            if (res.ok) {
                setReplyMessage('');
                fetchTicket();
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to send reply');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        try {
            const res = await fetch(`/api/tickets/${resolvedParams.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                fetchTicket();
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
                    <h2 className="text-2xl font-bold mb-2">Ticket Not Found</h2>
                    <p className="text-muted-foreground mb-6">This ticket doesn't exist or you don't have access to it.</p>
                    <Link href="/helpdesk">
                        <Button variant="neon">Back to Help Desk</Button>
                    </Link>
                </div>
            </div>
        );
    }

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
                        {isStaff && (
                            <select
                                value={ticket.status}
                                onChange={(e) => handleStatusChange(e.target.value)}
                                className="bg-secondary border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-neon-cyan/50"
                            >
                                <option value="open">Open</option>
                                <option value="in_progress">In Progress</option>
                                <option value="waiting">Waiting</option>
                                <option value="resolved">Resolved</option>
                                <option value="closed">Closed</option>
                            </select>
                        )}
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
                                    Conversation ({ticket.messages.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {ticket.messages.map((msg, index) => (
                                    <div
                                        key={msg.id}
                                        className={`p-4 rounded-lg border ${msg.isStaffReply
                                            ? 'bg-neon-cyan/5 border-neon-cyan/30'
                                            : 'bg-secondary/50 border-border'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="w-8 h-8">
                                                    {msg.avatarUrl && <AvatarImage src={msg.avatarUrl} alt={msg.username} />}
                                                    <AvatarFallback className={msg.isStaffReply ? 'bg-neon-cyan/20 text-neon-cyan' : 'bg-secondary'}>
                                                        {getInitials(msg.username || 'U')}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">{msg.username}</p>
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
                        {/* Ticket Info */}
                        <Card variant="glass">
                            <CardHeader>
                                <CardTitle className="text-lg">Ticket Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Created By</p>
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4" />
                                        <p className="font-medium">{ticket.username}</p>
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
                                {ticket.closedAt && (
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Closed</p>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Archive className="w-4 h-4" />
                                            {formatRelativeTime(ticket.closedAt)}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Activity */}
                        <Card variant="glass">
                            <CardHeader>
                                <CardTitle className="text-lg">Activity</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="w-2 h-2 rounded-full bg-neon-cyan"></div>
                                        <p className="text-muted-foreground">
                                            {ticket.messages.length} {ticket.messages.length === 1 ? 'reply' : 'replies'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                                        <p className="text-muted-foreground">
                                            Status: {status.label}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                                        <p className="text-muted-foreground">
                                            Priority: {priority.label}
                                        </p>
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
