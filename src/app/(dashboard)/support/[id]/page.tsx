'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
    Ticket, ArrowLeft, Send, Loader2, Clock, CheckCircle,
    AlertCircle, MessageCircle, User, Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatRelativeTime, getInitials } from '@/lib/utils';

interface TicketData {
    id: number;
    subject: string;
    category: string;
    priority: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    username: string;
}

interface MessageData {
    id: number;
    message: string;
    isStaffReply: boolean;
    createdAt: string;
    username: string;
    userRole: string;
}

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
    open: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: AlertCircle, label: 'Open' },
    in_progress: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock, label: 'In Progress' },
    waiting: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: MessageCircle, label: 'Awaiting Reply' },
    resolved: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle, label: 'Resolved' },
    closed: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: CheckCircle, label: 'Closed' },
};

export default function TicketPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [ticket, setTicket] = useState<TicketData | null>(null);
    const [messages, setMessages] = useState<MessageData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [reply, setReply] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isStaff, setIsStaff] = useState(false);

    useEffect(() => {
        fetchTicket();
    }, [id]);

    const fetchTicket = async () => {
        try {
            const res = await fetch(`/api/tickets/${id}`);
            if (res.ok) {
                const data = await res.json();
                setTicket(data.ticket);
                setMessages(data.messages || []);
                setIsStaff(data.isStaff);
            }
        } catch (error) {
            console.error('Error fetching ticket:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendReply = async () => {
        if (!reply.trim()) return;

        setIsSending(true);
        try {
            const res = await fetch(`/api/tickets/${id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: reply }),
            });

            if (res.ok) {
                setReply('');
                fetchTicket(); // Refresh messages
            }
        } catch (error) {
            console.error('Error sending reply:', error);
        } finally {
            setIsSending(false);
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
            <div className="container mx-auto px-4 py-8 text-center">
                <Ticket className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h1 className="text-2xl font-bold mb-2">Ticket Not Found</h1>
                <p className="text-muted-foreground mb-4">This ticket doesn&apos;t exist or you don&apos;t have permission to view it.</p>
                <Link href="/support">
                    <Button variant="neon-outline">Back to Support</Button>
                </Link>
            </div>
        );
    }

    const status = statusConfig[ticket.status] || statusConfig.open;
    const StatusIcon = status.icon;
    const isClosed = ticket.status === 'closed';

    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl">
            {/* Header */}
            <div className="mb-6">
                <Link href="/support" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Support
                </Link>
            </div>

            {/* Ticket Info */}
            <Card variant="glass" className="mb-6">
                <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2 mb-2">
                                <Ticket className="w-5 h-5 text-neon-cyan" />
                                {ticket.subject}
                            </CardTitle>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>#{ticket.id}</span>
                                <span>•</span>
                                <span>{ticket.category}</span>
                                <span>•</span>
                                <span>Created {formatRelativeTime(ticket.createdAt)}</span>
                            </div>
                        </div>
                        <Badge variant="outline" className={status.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                        </Badge>
                    </div>
                </CardHeader>
            </Card>

            {/* Messages */}
            <Card variant="glass" className="mb-6">
                <CardContent className="p-0">
                    <div className="divide-y divide-border">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`p-4 ${msg.isStaffReply ? 'bg-neon-cyan/5' : ''}`}>
                                <div className="flex items-start gap-3">
                                    <Avatar className="w-8 h-8">
                                        <AvatarFallback className={msg.isStaffReply ? 'bg-neon-cyan/20 text-neon-cyan' : ''}>
                                            {msg.isStaffReply ? <Shield className="w-4 h-4" /> : getInitials(msg.username || 'U')}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium">{msg.username || 'User'}</span>
                                            {msg.isStaffReply && (
                                                <Badge variant="outline" className="text-xs bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30">
                                                    Staff
                                                </Badge>
                                            )}
                                            <span className="text-xs text-muted-foreground">
                                                {formatRelativeTime(msg.createdAt)}
                                            </span>
                                        </div>
                                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Reply Box */}
            {!isClosed ? (
                <Card variant="glass">
                    <CardContent className="p-4">
                        <div className="space-y-4">
                            <textarea
                                placeholder="Write your reply..."
                                value={reply}
                                onChange={(e) => setReply(e.target.value)}
                                className="w-full bg-secondary/50 border border-border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 min-h-[100px]"
                            />
                            <div className="flex justify-end">
                                <Button
                                    variant="gradient"
                                    onClick={handleSendReply}
                                    disabled={isSending || !reply.trim()}
                                >
                                    {isSending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4 mr-2" />
                                            Send Reply
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card variant="glass">
                    <CardContent className="p-4 text-center text-muted-foreground">
                        <p>This ticket is closed. If you need further assistance, please create a new ticket.</p>
                        <Link href="/support/new" className="mt-4 inline-block">
                            <Button variant="neon-outline">Create New Ticket</Button>
                        </Link>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
