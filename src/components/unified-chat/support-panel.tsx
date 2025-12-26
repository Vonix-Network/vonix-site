'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
    Ticket, Plus, Send, Loader2, ArrowDown, Clock, CheckCircle, AlertCircle, MessageCircle, Shield
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn, formatRelativeTime, getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
    avatarUrl?: string | null;
}

const statusConfig: Record<string, { color: string; icon: any }> = {
    open: { color: 'text-blue-400', icon: AlertCircle },
    in_progress: { color: 'text-yellow-400', icon: Clock },
    waiting: { color: 'text-purple-400', icon: MessageCircle },
    resolved: { color: 'text-green-400', icon: CheckCircle },
    closed: { color: 'text-gray-400', icon: CheckCircle },
};

type SupportView = 'list' | 'new' | 'conversation';

interface SupportPanelProps {
    isMobile: boolean;
    onBack?: () => void;
}

export function SupportPanel({ isMobile, onBack }: SupportPanelProps) {
    const { data: session } = useSession();
    const [view, setView] = useState<SupportView>('list');
    const [tickets, setTickets] = useState<TicketData[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
    const [messages, setMessages] = useState<MessageData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [reply, setReply] = useState('');
    const [hasNewMessages, setHasNewMessages] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    // New ticket form
    const [newTicket, setNewTicket] = useState({
        subject: '',
        category: 'general',
        message: '',
    });

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setHasNewMessages(false);
    }, []);

    const fetchTickets = async () => {
        try {
            const res = await fetch('/api/tickets');
            if (res.ok) {
                const data = await res.json();
                setTickets(data.tickets || []);
            }
        } catch (error: any) {
            console.error('Error fetching tickets:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMessages = async (ticketId: number) => {
        try {
            const res = await fetch(`/api/tickets/${ticketId}`);
            if (res.ok) {
                const data = await res.json();
                setSelectedTicket(data.ticket);
                const prevLength = messages.length;
                setMessages(data.messages || []);
                if (data.messages.length > prevLength) {
                    setHasNewMessages(true);
                }
            }
        } catch (error: any) {
            console.error('Error fetching messages:', error);
        }
    };

    useEffect(() => {
        if (session?.user) {
            fetchTickets();
        }
    }, [session]);

    // Poll for new messages when in conversation view
    useEffect(() => {
        if (view === 'conversation' && selectedTicket) {
            const interval = setInterval(() => {
                fetchMessages(selectedTicket.id);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [view, selectedTicket]);

    const openTicket = async (ticket: TicketData) => {
        setSelectedTicket(ticket);
        setView('conversation');
        await fetchMessages(ticket.id);
        setTimeout(scrollToBottom, 100);
    };

    const handleSendReply = async () => {
        if (!reply.trim() || !selectedTicket) return;

        setIsSending(true);
        try {
            const res = await fetch(`/api/tickets/${selectedTicket.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: reply }),
            });

            if (res.ok) {
                setReply('');
                await fetchMessages(selectedTicket.id);
                setTimeout(scrollToBottom, 100);
            }
        } catch (error: any) {
            console.error('Error sending reply:', error);
        } finally {
            setIsSending(false);
        }
    };

    const handleCreateTicket = async () => {
        if (!newTicket.subject.trim() || !newTicket.message.trim()) return;

        setIsSending(true);
        try {
            const res = await fetch('/api/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: newTicket.subject,
                    category: newTicket.category,
                    message: newTicket.message,
                    priority: 'normal',
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setNewTicket({ subject: '', category: 'general', message: '' });
                await fetchTickets();
                openTicket(data.ticket);
            }
        } catch (error: any) {
            console.error('Error creating ticket:', error);
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendReply();
        }
    };

    const goBack = () => {
        if (view === 'conversation' || view === 'new') {
            setView('list');
            setSelectedTicket(null);
            setMessages([]);
            fetchTickets();
        } else if (onBack) {
            onBack();
        }
    };

    if (!session?.user) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-4 text-center">
                <Ticket className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground">Log in to access support</p>
            </div>
        );
    }

    // Ticket List View
    if (view === 'list') {
        return (
            <div className="h-full flex flex-col">
                {/* Header Actions */}
                <div className="p-3 border-b border-white/10">
                    <button
                        onClick={() => setView('new')}
                        className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-gradient-to-r from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/30 hover:border-neon-cyan/50 transition-colors"
                    >
                        <Plus className="w-4 h-4 text-neon-cyan" />
                        <span className="font-medium">New Support Ticket</span>
                    </button>
                </div>

                {/* Tickets List */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-32">
                            <Loader2 className="w-6 h-6 animate-spin text-neon-cyan" />
                        </div>
                    ) : tickets.length > 0 ? (
                        <div className="divide-y divide-white/5">
                            {tickets.map((ticket: any) => {
                                const status = statusConfig[ticket.status] || statusConfig.open;
                                const StatusIcon = status.icon;

                                return (
                                    <button
                                        key={ticket.id}
                                        onClick={() => openTicket(ticket)}
                                        className="w-full p-3 text-left hover:bg-white/5 transition-colors"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={cn('mt-1', status.color)}>
                                                <StatusIcon className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{ticket.subject}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    #{ticket.id} • {formatRelativeTime(ticket.updatedAt)}
                                                </p>
                                            </div>
                                            <Badge variant="outline" className="text-xs shrink-0">
                                                {ticket.category}
                                            </Badge>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-32 text-center p-4">
                            <Ticket className="w-8 h-8 text-muted-foreground opacity-50 mb-2" />
                            <p className="text-sm text-muted-foreground">No tickets yet</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // New Ticket View
    if (view === 'new') {
        return (
            <div className="h-full flex flex-col">
                {/* Back Button */}
                <div className="p-3 border-b border-white/10">
                    <button onClick={goBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to tickets
                    </button>
                </div>

                {/* Form */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    <div>
                        <label className="text-xs font-medium text-muted-foreground">Subject</label>
                        <input
                            type="text"
                            placeholder="Brief summary..."
                            value={newTicket.subject}
                            onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                            className="w-full mt-1 p-2 rounded-lg bg-secondary/50 border border-white/10 text-sm focus:outline-none focus:border-neon-cyan/50"
                            maxLength={100}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-medium text-muted-foreground">Category</label>
                        <select
                            value={newTicket.category}
                            onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                            className="w-full mt-1 p-2 rounded-lg bg-secondary/50 border border-white/10 text-sm focus:outline-none focus:border-neon-cyan/50"
                        >
                            <option value="general">General</option>
                            <option value="account">Account</option>
                            <option value="billing">Billing</option>
                            <option value="technical">Technical</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-muted-foreground">Message</label>
                        <textarea
                            placeholder="Describe your issue..."
                            value={newTicket.message}
                            onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                            className="w-full mt-1 p-2 rounded-lg bg-secondary/50 border border-white/10 text-sm focus:outline-none focus:border-neon-cyan/50 resize-none h-24"
                        />
                    </div>
                </div>

                {/* Submit */}
                <div className="p-3 border-t border-white/10">
                    <button
                        onClick={handleCreateTicket}
                        disabled={isSending || !newTicket.subject.trim() || !newTicket.message.trim()}
                        className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-gradient-to-r from-neon-cyan to-neon-purple text-white font-medium disabled:opacity-50"
                    >
                        {isSending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                        Submit Ticket
                    </button>
                </div>
            </div>
        );
    }

    // Conversation View
    return (
        <div className="h-full flex flex-col">
            {/* Ticket Header */}
            <div className="p-3 border-b border-white/10">
                <button onClick={goBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to tickets
                </button>
                {selectedTicket && (
                    <div>
                        <p className="font-medium truncate">{selectedTicket.subject}</p>
                        <p className="text-xs text-muted-foreground">#{selectedTicket.id} • {selectedTicket.category}</p>
                    </div>
                )}
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.map((msg: any) => (
                    <div key={msg.id} className={cn('flex gap-2', msg.isStaffReply ? 'flex-row' : 'flex-row-reverse')}>
                        <Avatar className="w-7 h-7 shrink-0">
                            {msg.avatarUrl && <AvatarImage src={msg.avatarUrl} alt={msg.username} />}
                            <AvatarFallback className={cn('text-xs', msg.isStaffReply ? 'bg-neon-cyan/20 text-neon-cyan' : 'bg-secondary')}>
                                {msg.isStaffReply ? <Shield className="w-3 h-3" /> : getInitials(msg.username || 'U')}
                            </AvatarFallback>
                        </Avatar>
                        <div className={cn(
                            'max-w-[80%] rounded-lg p-2 text-sm',
                            msg.isStaffReply
                                ? 'bg-neon-cyan/10 border border-neon-cyan/30'
                                : 'bg-secondary'
                        )}>
                            {msg.isStaffReply && (
                                <p className="text-xs text-neon-cyan font-medium mb-1">Staff</p>
                            )}
                            <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {formatRelativeTime(msg.createdAt)}
                            </p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* New Message Indicator */}
            {hasNewMessages && (
                <button
                    onClick={scrollToBottom}
                    className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 rounded-full bg-neon-cyan text-white text-xs"
                >
                    <ArrowDown className="w-3 h-3" />
                    New messages
                </button>
            )}

            {/* Reply Input */}
            {selectedTicket?.status !== 'closed' ? (
                <div className="p-3 border-t border-white/10">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Type your message..."
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="flex-1 p-2 rounded-lg bg-secondary/50 border border-white/10 text-sm focus:outline-none focus:border-neon-cyan/50"
                        />
                        <button
                            onClick={handleSendReply}
                            disabled={isSending || !reply.trim()}
                            className="p-2 rounded-lg bg-neon-cyan text-white disabled:opacity-50"
                        >
                            {isSending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="p-3 border-t border-white/10 text-center text-sm text-muted-foreground">
                    This ticket is closed
                </div>
            )}
        </div>
    );
}
