'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Ticket, Plus, MessageCircle, Clock, CheckCircle,
    AlertCircle, Loader2, ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils';

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

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
    open: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: AlertCircle, label: 'Open' },
    in_progress: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock, label: 'In Progress' },
    waiting: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: MessageCircle, label: 'Awaiting Reply' },
    resolved: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle, label: 'Resolved' },
    closed: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: CheckCircle, label: 'Closed' },
};

const priorityConfig: Record<string, string> = {
    low: 'bg-gray-500/20 text-gray-400',
    normal: 'bg-blue-500/20 text-blue-400',
    high: 'bg-orange-500/20 text-orange-400',
    urgent: 'bg-red-500/20 text-red-400',
};

export default function SupportPage() {
    const { status } = useSession();
    const router = useRouter();
    const [tickets, setTickets] = useState<TicketData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login?callbackUrl=/support');
        }
    }, [status, router]);

    useEffect(() => {
        fetchTickets();
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

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold gradient-text mb-2">Support</h1>
                    <p className="text-muted-foreground">
                        Need help? Create a support ticket and we&apos;ll get back to you.
                    </p>
                </div>
                <Link href="/support/new">
                    <Button variant="gradient">
                        <Plus className="w-4 h-4 mr-2" />
                        New Ticket
                    </Button>
                </Link>
            </div>

            {/* Tickets List */}
            <Card variant="glass">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Ticket className="w-5 h-5 text-neon-cyan" />
                        Your Tickets
                    </CardTitle>
                    <CardDescription>
                        View and manage your support requests
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
                        </div>
                    ) : tickets.length > 0 ? (
                        <div className="space-y-3">
                            {tickets.map((ticket) => {
                                const status = statusConfig[ticket.status] || statusConfig.open;
                                const StatusIcon = status.icon;

                                return (
                                    <Link key={ticket.id} href={`/support/${ticket.id}`}>
                                        <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group">
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className={`p-2 rounded-lg ${status.color}`}>
                                                    <StatusIcon className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="font-medium truncate group-hover:text-neon-cyan transition-colors">
                                                        {ticket.subject}
                                                    </h3>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <span>#{ticket.id}</span>
                                                        <span>•</span>
                                                        <Badge variant="outline" className={priorityConfig[ticket.priority]}>
                                                            {ticket.priority}
                                                        </Badge>
                                                        <span>•</span>
                                                        <span>{formatRelativeTime(ticket.updatedAt)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Badge variant="outline" className={status.color}>
                                                    {status.label}
                                                </Badge>
                                                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-neon-cyan transition-colors" />
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Ticket className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <p className="text-muted-foreground mb-4">No support tickets yet</p>
                            <Link href="/support/new">
                                <Button variant="neon-outline">Create Your First Ticket</Button>
                            </Link>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
