'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
    ArrowLeft, Send, Loader2, AlertCircle, Clock, CheckCircle,
    MessageSquare, User, Calendar, Tag, Flag, Archive, Users,
    ExternalLink, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
    discordThreadId?: string;
    messages: TicketMessage[];
}

const statusConfig: Record<string, { color: string; bgColor: string; icon: any; label: string }> = {
    open: { color: 'text-blue-400', bgColor: 'bg-blue-500/20 border-blue-500/30', icon: AlertCircle, label: 'Open' },
    in_progress: { color: 'text-yellow-400', bgColor: 'bg-yellow-500/20 border-yellow-500/30', icon: Clock, label: 'In Progress' },
    waiting: { color: 'text-purple-400', bgColor: 'bg-purple-500/20 border-purple-500/30', icon: MessageSquare, label: 'Waiting' },
    resolved: { color: 'text-green-400', bgColor: 'bg-green-500/20 border-green-500/30', icon: CheckCircle, label: 'Resolved' },
    closed: { color: 'text-gray-400', bgColor: 'bg-gray-500/20 border-gray-500/30', icon: Archive, label: 'Closed' },
};

const priorityConfig: Record<string, { color: string; label: string }> = {
    low: { color: 'bg-gray-500/20 text-gray-400', label: 'Low' },
    normal: { color: 'bg-blue-500/20 text-blue-400', label: 'Normal' },
    high: { color: 'bg-orange-500/20 text-orange-400', label: 'High' },
    urgent: { color: 'bg-red-500/20 text-red-400 animate-pulse', label: 'Urgent' },
};

export default function AdminTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const { data: session } = useSession();
    const [ticket, setTicket] = useState<TicketData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [replyMessage, setReplyMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (session) {
            const userRole = (session.user as any)?.role;
            if (!['admin', 'superadmin', 'moderator'].includes(userRole)) {
                router.push('/helpdesk');
            } else {
                fetchTicket();
            }
        }
    }, [session]);

    const fetchTicket = async (showRefresh = false) => {
        if (showRefresh) setIsRefreshing(true);
        try {
            const res = await fetch(`/api/tickets/${resolvedParams.id}`);
            if (res.ok) {
                const data = await res.json();
                // API returns { ticket, messages, isStaff } - merge messages into ticket
                setTicket({
                    ...data.ticket,
                    messages: data.messages || [],
                });
            } else if (res.status === 403) {
                router.push('/admin/helpdesk');
            }
        } catch (error: any) {
            console.error('Error fetching ticket:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
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
        } catch (err: any) {
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
        } catch (error: any) {
            console.error('Error updating status:', error);
        }
    };

    const handlePriorityChange = async (newPriority: string) => {
        try {
            const res = await fetch(`/api/tickets/${resolvedParams.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ priority: newPriority }),
            });
            if (res.ok) {
                fetchTicket();
            }
        } catch (error: any) {
            console.error('Error updating priority:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="text-center py-16">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
                <h2 className="text-2xl font-bold mb-2">Ticket Not Found</h2>
                <p className="text-muted-foreground mb-6">This ticket doesn't exist or was deleted.</p>
                <Link href="/admin/helpdesk">
                    <Button variant="neon">Back to Help Desk</Button>
                </Link>
            </div>
        );
    }

    const statusInfo = statusConfig[ticket.status] || statusConfig.open;
    const priorityInfo = priorityConfig[ticket.priority] || priorityConfig.normal;
    const StatusIcon = statusInfo.icon;
    const isClosed = ticket.status === 'closed' || ticket.status === 'resolved';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/admin/helpdesk">
                        <Button variant="ghost" size="sm" className="gap-2">
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl font-bold">Ticket #{ticket.id}</h1>
                            <Badge className={`${statusInfo.bgColor} ${statusInfo.color}`}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {statusInfo.label}
                            </Badge>
                            <Badge className={priorityInfo.color}>
                                <Flag className="w-3 h-3 mr-1" />
                                {priorityInfo.label}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1">{ticket.subject}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchTicket(true)}
                        disabled={isRefreshing}
                        className="gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    {ticket.discordThreadId && (
                        <Button variant="outline" size="sm" className="gap-2">
                            <ExternalLink className="w-4 h-4" />
                            View in Discord
                        </Button>
                    )}
                </div>
            </div>

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
                        <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
                            {ticket.messages.map((msg: any) => (
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
                    {!isClosed ? (
                        <Card variant="glass">
                            <CardHeader>
                                <CardTitle>Staff Reply</CardTitle>
                                <CardDescription>Your reply will be marked as a staff response</CardDescription>
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
                                        placeholder="Type your response..."
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
                    ) : (
                        <Card variant="glass" className="border-yellow-500/30">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3">
                                    <Archive className="w-5 h-5 text-yellow-400" />
                                    <p className="text-muted-foreground">
                                        This ticket is {ticket.status}. Reopen it to add new replies.
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleStatusChange('open')}
                                    >
                                        Reopen Ticket
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Ticket Management */}
                    <Card variant="glass">
                        <CardHeader>
                            <CardTitle className="text-lg">Ticket Management</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-xs text-muted-foreground mb-2 block">Status</label>
                                <select
                                    value={ticket.status}
                                    onChange={(e) => handleStatusChange(e.target.value)}
                                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neon-cyan/50"
                                >
                                    <option value="open">Open</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="waiting">Waiting</option>
                                    <option value="resolved">Resolved</option>
                                    <option value="closed">Closed</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground mb-2 block">Priority</label>
                                <select
                                    value={ticket.priority}
                                    onChange={(e) => handlePriorityChange(e.target.value)}
                                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neon-cyan/50"
                                >
                                    <option value="low">Low</option>
                                    <option value="normal">Normal</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Ticket Info */}
                    <Card variant="glass">
                        <CardHeader>
                            <CardTitle className="text-lg">Ticket Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Submitted By</p>
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    <Link href={`/admin/users?search=${ticket.username}`} className="font-medium hover:text-neon-cyan transition-colors">
                                        {ticket.username}
                                    </Link>
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
                            {ticket.discordThreadId && (
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Discord Thread</p>
                                    <Badge variant="outline" className="gap-1 text-neon-purple">
                                        <MessageSquare className="w-3 h-3" />
                                        Linked
                                    </Badge>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card variant="glass">
                        <CardHeader>
                            <CardTitle className="text-lg">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start gap-2"
                                onClick={() => handleStatusChange('resolved')}
                                disabled={ticket.status === 'resolved'}
                            >
                                <CheckCircle className="w-4 h-4 text-green-400" />
                                Mark as Resolved
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start gap-2"
                                onClick={() => handleStatusChange('closed')}
                                disabled={ticket.status === 'closed'}
                            >
                                <Archive className="w-4 h-4 text-gray-400" />
                                Close Ticket
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start gap-2"
                                onClick={() => handlePriorityChange('urgent')}
                                disabled={ticket.priority === 'urgent'}
                            >
                                <Flag className="w-4 h-4 text-red-400" />
                                Escalate to Urgent
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
