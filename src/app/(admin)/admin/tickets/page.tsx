'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Ticket, Eye, MessageCircle, Clock, CheckCircle,
    AlertCircle, Loader2, Filter, User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    userId: number;
    assignedTo: number | null;
}

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
    open: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: AlertCircle, label: 'Open' },
    in_progress: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock, label: 'In Progress' },
    waiting: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: MessageCircle, label: 'Waiting' },
    resolved: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle, label: 'Resolved' },
    closed: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: CheckCircle, label: 'Closed' },
};

const priorityConfig: Record<string, string> = {
    low: 'bg-gray-500/20 text-gray-400',
    normal: 'bg-blue-500/20 text-blue-400',
    high: 'bg-orange-500/20 text-orange-400',
    urgent: 'bg-red-500/20 text-red-400 animate-pulse',
};

export default function AdminTicketsPage() {
    const [tickets, setTickets] = useState<TicketData[]>([]);
    const [counts, setCounts] = useState<{ open: number; inProgress: number; total: number } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            const res = await fetch('/api/tickets');
            if (res.ok) {
                const data = await res.json();
                setTickets(data.tickets || []);
                setCounts(data.counts);
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusChange = async (ticketId: number, newStatus: string) => {
        try {
            const res = await fetch(`/api/tickets/${ticketId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                fetchTickets();
            }
        } catch (error) {
            console.error('Error updating ticket:', error);
        }
    };

    const filteredTickets = statusFilter === 'all'
        ? tickets
        : tickets.filter(t => t.status === statusFilter);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Support Tickets</h1>
                    <p className="text-muted-foreground">Manage user support requests</p>
                </div>
            </div>

            {/* Stats */}
            {counts && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card variant="glass">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-blue-500/20">
                                <AlertCircle className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{counts.open}</p>
                                <p className="text-sm text-muted-foreground">Open Tickets</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card variant="glass">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-yellow-500/20">
                                <Clock className="w-6 h-6 text-yellow-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{counts.inProgress}</p>
                                <p className="text-sm text-muted-foreground">In Progress</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card variant="glass">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-neon-cyan/20">
                                <Ticket className="w-6 h-6 text-neon-cyan" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{counts.total}</p>
                                <p className="text-sm text-muted-foreground">Total Tickets</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Filter */}
            <Card variant="glass">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="w-5 h-5" />
                            Filter
                        </CardTitle>
                        <div className="flex gap-2 flex-wrap">
                            {['all', 'open', 'in_progress', 'waiting', 'resolved', 'closed'].map((s) => (
                                <Button
                                    key={s}
                                    variant={statusFilter === s ? 'neon' : 'ghost'}
                                    size="sm"
                                    onClick={() => setStatusFilter(s)}
                                >
                                    {s === 'all' ? 'All' : statusConfig[s]?.label || s}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Tickets Table */}
            <Card variant="glass">
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
                        </div>
                    ) : filteredTickets.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left p-4 font-medium text-muted-foreground">ID</th>
                                        <th className="text-left p-4 font-medium text-muted-foreground">Subject</th>
                                        <th className="text-left p-4 font-medium text-muted-foreground">User</th>
                                        <th className="text-left p-4 font-medium text-muted-foreground">Category</th>
                                        <th className="text-left p-4 font-medium text-muted-foreground">Priority</th>
                                        <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                                        <th className="text-left p-4 font-medium text-muted-foreground">Updated</th>
                                        <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTickets.map((ticket) => {
                                        const status = statusConfig[ticket.status] || statusConfig.open;
                                        const StatusIcon = status.icon;

                                        return (
                                            <tr key={ticket.id} className="border-b border-border/50 hover:bg-secondary/50">
                                                <td className="p-4 text-sm text-muted-foreground">#{ticket.id}</td>
                                                <td className="p-4">
                                                    <Link href={`/support/${ticket.id}`} className="font-medium hover:text-neon-cyan">
                                                        {ticket.subject}
                                                    </Link>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-4 h-4 text-muted-foreground" />
                                                        <span className="text-sm">{ticket.username || 'Unknown'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <Badge variant="outline">{ticket.category}</Badge>
                                                </td>
                                                <td className="p-4">
                                                    <Badge className={priorityConfig[ticket.priority]}>
                                                        {ticket.priority}
                                                    </Badge>
                                                </td>
                                                <td className="p-4">
                                                    <select
                                                        value={ticket.status}
                                                        onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                                                        className="bg-secondary border border-border rounded px-2 py-1 text-sm"
                                                    >
                                                        <option value="open">Open</option>
                                                        <option value="in_progress">In Progress</option>
                                                        <option value="waiting">Waiting</option>
                                                        <option value="resolved">Resolved</option>
                                                        <option value="closed">Closed</option>
                                                    </select>
                                                </td>
                                                <td className="p-4 text-sm text-muted-foreground">
                                                    {formatRelativeTime(ticket.updatedAt)}
                                                </td>
                                                <td className="p-4">
                                                    <Link href={`/support/${ticket.id}`}>
                                                        <Button variant="ghost" size="sm">
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Ticket className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <p className="text-muted-foreground">No tickets found</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
