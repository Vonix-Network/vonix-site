'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    Ticket, MessageSquare, Clock, CheckCircle, AlertCircle,
    TrendingUp, Users, Filter, Search, Plus, Eye,
    BarChart3, Activity, Zap, Archive, Star, Tag,
    Calendar, ArrowUpRight, ArrowDownRight, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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

interface TicketStats {
    open: number;
    inProgress: number;
    total: number;
    avgResponseTime?: number;
    satisfactionRate?: number;
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

export default function HelpdeskPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [tickets, setTickets] = useState<TicketData[]>([]);
    const [stats, setStats] = useState<TicketStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isStaff, setIsStaff] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated') {
            const userRole = (session?.user as any)?.role;
            const staffRoles = ['admin', 'superadmin', 'moderator'];
            setIsStaff(staffRoles.includes(userRole));
            fetchTickets();
        }
    }, [status, session, router]);

    const fetchTickets = async () => {
        try {
            const res = await fetch('/api/tickets');
            if (res.ok) {
                const data = await res.json();
                setTickets(data.tickets || []);
                setStats(data.counts);
                setIsStaff(data.isStaff);
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

    const filteredTickets = tickets.filter(ticket => {
        const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
        const matchesSearch = searchQuery === '' ||
            ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ticket.username.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    if (status === 'loading' || isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/30">
                                <Ticket className="w-6 h-6 text-neon-cyan" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold gradient-text">Help Desk</h1>
                                <p className="text-sm text-muted-foreground">
                                    {isStaff ? 'Manage support tickets' : 'Your support tickets'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link href="/">
                                <Button variant="ghost" size="sm">
                                    Back to Home
                                </Button>
                            </Link>
                            <Link href="/helpdesk/new">
                                <Button variant="neon" size="sm" className="gap-2">
                                    <Plus className="w-4 h-4" />
                                    New Ticket
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                {/* Stats Dashboard */}
                {isStaff && stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <Card variant="glass" className="border-blue-500/30">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 rounded-lg bg-blue-500/20">
                                        <AlertCircle className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <Badge className="bg-blue-500/20 text-blue-400">
                                        <ArrowUpRight className="w-3 h-3 mr-1" />
                                        Active
                                    </Badge>
                                </div>
                                <p className="text-3xl font-bold mb-1">{stats.open}</p>
                                <p className="text-sm text-muted-foreground">Open Tickets</p>
                            </CardContent>
                        </Card>

                        <Card variant="glass" className="border-yellow-500/30">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 rounded-lg bg-yellow-500/20">
                                        <Clock className="w-6 h-6 text-yellow-400" />
                                    </div>
                                    <Badge className="bg-yellow-500/20 text-yellow-400">
                                        <Activity className="w-3 h-3 mr-1" />
                                        Working
                                    </Badge>
                                </div>
                                <p className="text-3xl font-bold mb-1">{stats.inProgress}</p>
                                <p className="text-sm text-muted-foreground">In Progress</p>
                            </CardContent>
                        </Card>

                        <Card variant="glass" className="border-neon-cyan/30">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 rounded-lg bg-neon-cyan/20">
                                        <BarChart3 className="w-6 h-6 text-neon-cyan" />
                                    </div>
                                    <Badge className="bg-neon-cyan/20 text-neon-cyan">
                                        <TrendingUp className="w-3 h-3 mr-1" />
                                        Total
                                    </Badge>
                                </div>
                                <p className="text-3xl font-bold mb-1">{stats.total}</p>
                                <p className="text-sm text-muted-foreground">All Time</p>
                            </CardContent>
                        </Card>

                        <Card variant="glass" className="border-green-500/30">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 rounded-lg bg-green-500/20">
                                        <Zap className="w-6 h-6 text-green-400" />
                                    </div>
                                    <Badge className="bg-green-500/20 text-green-400">
                                        <Star className="w-3 h-3 mr-1" />
                                        Avg
                                    </Badge>
                                </div>
                                <p className="text-3xl font-bold mb-1">
                                    {stats.avgResponseTime ? `${stats.avgResponseTime}h` : '< 1h'}
                                </p>
                                <p className="text-sm text-muted-foreground">Response Time</p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Filters and Search */}
                <Card variant="glass" className="mb-6">
                    <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row gap-4">
                            {/* Search */}
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search tickets by subject or user..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            {/* Status Filter */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <Filter className="w-4 h-4 text-muted-foreground" />
                                {['all', 'open', 'in_progress', 'waiting', 'resolved', 'closed'].map((status) => (
                                    <Button
                                        key={status}
                                        variant={statusFilter === status ? 'neon' : 'ghost'}
                                        size="sm"
                                        onClick={() => setStatusFilter(status)}
                                    >
                                        {status === 'all' ? 'All' : statusConfig[status]?.label || status}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tickets Table */}
                <Card variant="glass">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5" />
                            Tickets ({filteredTickets.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {filteredTickets.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="text-left p-4 font-medium text-muted-foreground">ID</th>
                                            <th className="text-left p-4 font-medium text-muted-foreground">Subject</th>
                                            {isStaff && <th className="text-left p-4 font-medium text-muted-foreground">User</th>}
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
                                            const priority = priorityConfig[ticket.priority] || priorityConfig.normal;
                                            const StatusIcon = status.icon;

                                            return (
                                                <tr key={ticket.id} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                                                    <td className="p-4">
                                                        <span className="text-sm font-mono text-muted-foreground">#{ticket.id}</span>
                                                    </td>
                                                    <td className="p-4">
                                                        <Link href={`/helpdesk/${ticket.id}`} className="font-medium hover:text-neon-cyan transition-colors">
                                                            {ticket.subject}
                                                        </Link>
                                                    </td>
                                                    {isStaff && (
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-2">
                                                                <Users className="w-4 h-4 text-muted-foreground" />
                                                                <span className="text-sm">{ticket.username || 'Unknown'}</span>
                                                            </div>
                                                        </td>
                                                    )}
                                                    <td className="p-4">
                                                        <Badge variant="outline" className="gap-1">
                                                            <Tag className="w-3 h-3" />
                                                            {ticket.category}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-4">
                                                        <Badge className={priority.color}>
                                                            {priority.label}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-4">
                                                        {isStaff ? (
                                                            <select
                                                                value={ticket.status}
                                                                onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                                                                className="bg-secondary border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neon-cyan/50"
                                                            >
                                                                <option value="open">Open</option>
                                                                <option value="in_progress">In Progress</option>
                                                                <option value="waiting">Waiting</option>
                                                                <option value="resolved">Resolved</option>
                                                                <option value="closed">Closed</option>
                                                            </select>
                                                        ) : (
                                                            <Badge className={status.color}>
                                                                <StatusIcon className="w-3 h-3 mr-1" />
                                                                {status.label}
                                                            </Badge>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <Calendar className="w-3 h-3" />
                                                            {formatRelativeTime(ticket.updatedAt)}
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <Link href={`/helpdesk/${ticket.id}`}>
                                                            <Button variant="ghost" size="sm" className="gap-2">
                                                                <Eye className="w-4 h-4" />
                                                                View
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
                            <div className="text-center py-16">
                                <Ticket className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                                <p className="text-lg font-medium mb-2">No tickets found</p>
                                <p className="text-sm text-muted-foreground mb-6">
                                    {searchQuery ? 'Try adjusting your search' : 'Create your first ticket to get started'}
                                </p>
                                <Link href="/helpdesk/new">
                                    <Button variant="neon" className="gap-2">
                                        <Plus className="w-4 h-4" />
                                        Create Ticket
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
