'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    Ticket, MessageSquare, Clock, CheckCircle, AlertCircle,
    TrendingUp, Users, Filter, Search, Eye, RefreshCw,
    BarChart3, Activity, Zap, Archive, Star, Tag,
    Calendar, ArrowUpRight, Loader2, UserCheck, AlertTriangle,
    ChevronDown, LayoutDashboard, Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
    discordThreadId?: string;
}

interface TicketStats {
    open: number;
    inProgress: number;
    waiting: number;
    resolved: number;
    closed: number;
    total: number;
    avgResponseTime?: number;
}

const statusConfig: Record<string, { color: string; bgColor: string; icon: any; label: string }> = {
    open: { color: 'text-blue-400', bgColor: 'bg-blue-500/20 border-blue-500/30', icon: AlertCircle, label: 'Open' },
    in_progress: { color: 'text-yellow-400', bgColor: 'bg-yellow-500/20 border-yellow-500/30', icon: Clock, label: 'In Progress' },
    waiting: { color: 'text-purple-400', bgColor: 'bg-purple-500/20 border-purple-500/30', icon: MessageSquare, label: 'Waiting' },
    resolved: { color: 'text-green-400', bgColor: 'bg-green-500/20 border-green-500/30', icon: CheckCircle, label: 'Resolved' },
    closed: { color: 'text-gray-400', bgColor: 'bg-gray-500/20 border-gray-500/30', icon: Archive, label: 'Closed' },
};

const priorityConfig: Record<string, { color: string; label: string; order: number }> = {
    urgent: { color: 'bg-red-500/20 text-red-400 animate-pulse', label: 'Urgent', order: 0 },
    high: { color: 'bg-orange-500/20 text-orange-400', label: 'High', order: 1 },
    normal: { color: 'bg-blue-500/20 text-blue-400', label: 'Normal', order: 2 },
    low: { color: 'bg-gray-500/20 text-gray-400', label: 'Low', order: 3 },
};

export default function AdminHelpdeskPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [tickets, setTickets] = useState<TicketData[]>([]);
    const [stats, setStats] = useState<TicketStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'updated' | 'created' | 'priority'>('updated');

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated') {
            const userRole = (session?.user as any)?.role;
            if (!['admin', 'superadmin', 'moderator'].includes(userRole)) {
                router.push('/helpdesk');
            } else {
                fetchTickets();
            }
        }
    }, [status, session, router]);

    const fetchTickets = useCallback(async (showRefresh = false) => {
        if (showRefresh) setIsRefreshing(true);
        try {
            const res = await fetch('/api/tickets');
            if (res.ok) {
                const data = await res.json();
                setTickets(data.tickets || []);

                // Calculate stats
                const ticketList = data.tickets || [];
                setStats({
                    open: ticketList.filter((t: TicketData) => t.status === 'open').length,
                    inProgress: ticketList.filter((t: TicketData) => t.status === 'in_progress').length,
                    waiting: ticketList.filter((t: TicketData) => t.status === 'waiting').length,
                    resolved: ticketList.filter((t: TicketData) => t.status === 'resolved').length,
                    closed: ticketList.filter((t: TicketData) => t.status === 'closed').length,
                    total: ticketList.length,
                });
            }
        } catch (error: any) {
            console.error('Error fetching tickets:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

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
        } catch (error: any) {
            console.error('Error updating ticket:', error);
        }
    };

    const handlePriorityChange = async (ticketId: number, newPriority: string) => {
        try {
            const res = await fetch(`/api/tickets/${ticketId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ priority: newPriority }),
            });
            if (res.ok) {
                fetchTickets();
            }
        } catch (error: any) {
            console.error('Error updating ticket:', error);
        }
    };

    // Filter and sort tickets
    const filteredTickets = tickets
        .filter((ticket: any) => {
            const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
            const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
            const matchesSearch = searchQuery === '' ||
                ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                ticket.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                ticket.id.toString().includes(searchQuery);
            return matchesStatus && matchesPriority && matchesSearch;
        })
        .sort((a: any, b: any) => {
            if (sortBy === 'priority') {
                const priorityA = priorityConfig[a.priority]?.order ?? 3;
                const priorityB = priorityConfig[b.priority]?.order ?? 3;
                return priorityA - priorityB;
            } else if (sortBy === 'created') {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });

    if (status === 'loading' || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold gradient-text mb-2">Help Desk Management</h1>
                    <p className="text-muted-foreground">
                        Manage and respond to support tickets from all users
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchTickets(true)}
                        disabled={isRefreshing}
                        className="gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Link href="/admin/settings">
                        <Button variant="ghost" size="sm" className="gap-2">
                            <Settings className="w-4 h-4" />
                            Settings
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Dashboard */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <Card variant="glass" className="border-blue-500/30">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/20">
                                    <AlertCircle className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{stats.open}</p>
                                    <p className="text-xs text-muted-foreground">Open</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card variant="glass" className="border-yellow-500/30">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-yellow-500/20">
                                    <Clock className="w-5 h-5 text-yellow-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{stats.inProgress}</p>
                                    <p className="text-xs text-muted-foreground">In Progress</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card variant="glass" className="border-purple-500/30">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-500/20">
                                    <MessageSquare className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{stats.waiting}</p>
                                    <p className="text-xs text-muted-foreground">Waiting</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card variant="glass" className="border-green-500/30">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-green-500/20">
                                    <CheckCircle className="w-5 h-5 text-green-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{stats.resolved}</p>
                                    <p className="text-xs text-muted-foreground">Resolved</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card variant="glass" className="border-gray-500/30">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-gray-500/20">
                                    <Archive className="w-5 h-5 text-gray-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{stats.closed}</p>
                                    <p className="text-xs text-muted-foreground">Closed</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card variant="glass" className="border-neon-cyan/30">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-neon-cyan/20">
                                    <BarChart3 className="w-5 h-5 text-neon-cyan" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{stats.total}</p>
                                    <p className="text-xs text-muted-foreground">Total</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Filters */}
            <Card variant="glass">
                <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by subject, user, or ticket ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        {/* Status Filter */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Status:</span>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neon-cyan/50"
                            >
                                <option value="all">All Status</option>
                                <option value="open">Open</option>
                                <option value="in_progress">In Progress</option>
                                <option value="waiting">Waiting</option>
                                <option value="resolved">Resolved</option>
                                <option value="closed">Closed</option>
                            </select>
                        </div>

                        {/* Priority Filter */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Priority:</span>
                            <select
                                value={priorityFilter}
                                onChange={(e) => setPriorityFilter(e.target.value)}
                                className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neon-cyan/50"
                            >
                                <option value="all">All Priority</option>
                                <option value="urgent">Urgent</option>
                                <option value="high">High</option>
                                <option value="normal">Normal</option>
                                <option value="low">Low</option>
                            </select>
                        </div>

                        {/* Sort */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Sort:</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neon-cyan/50"
                            >
                                <option value="updated">Last Updated</option>
                                <option value="created">Newest First</option>
                                <option value="priority">Priority</option>
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tickets Table */}
            <Card variant="glass">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <Ticket className="w-5 h-5" />
                            Tickets ({filteredTickets.length})
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {filteredTickets.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border bg-secondary/30">
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
                                    {filteredTickets.map((ticket: any) => {
                                        const statusInfo = statusConfig[ticket.status] || statusConfig.open;
                                        const priorityInfo = priorityConfig[ticket.priority] || priorityConfig.normal;
                                        const StatusIcon = statusInfo.icon;

                                        return (
                                            <tr key={ticket.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                                                <td className="p-4">
                                                    <span className="text-sm font-mono text-muted-foreground">#{ticket.id}</span>
                                                </td>
                                                <td className="p-4">
                                                    <div>
                                                        <Link href={`/admin/helpdesk/${ticket.id}`} className="font-medium hover:text-neon-cyan transition-colors">
                                                            {ticket.subject}
                                                        </Link>
                                                        {ticket.discordThreadId && (
                                                            <Badge variant="outline" className="ml-2 text-xs">Discord</Badge>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <Users className="w-4 h-4 text-muted-foreground" />
                                                        <span className="text-sm">{ticket.username || 'Unknown'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <Badge variant="outline" className="gap-1">
                                                        <Tag className="w-3 h-3" />
                                                        {ticket.category}
                                                    </Badge>
                                                </td>
                                                <td className="p-4">
                                                    <select
                                                        value={ticket.priority}
                                                        onChange={(e) => handlePriorityChange(ticket.id, e.target.value)}
                                                        className={`rounded px-2 py-1 text-xs font-medium border-0 focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 ${priorityInfo.color}`}
                                                    >
                                                        <option value="low">Low</option>
                                                        <option value="normal">Normal</option>
                                                        <option value="high">High</option>
                                                        <option value="urgent">Urgent</option>
                                                    </select>
                                                </td>
                                                <td className="p-4">
                                                    <select
                                                        value={ticket.status}
                                                        onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                                                        className={`rounded px-2 py-1 text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 ${statusInfo.bgColor} ${statusInfo.color}`}
                                                    >
                                                        <option value="open">Open</option>
                                                        <option value="in_progress">In Progress</option>
                                                        <option value="waiting">Waiting</option>
                                                        <option value="resolved">Resolved</option>
                                                        <option value="closed">Closed</option>
                                                    </select>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Calendar className="w-3 h-3" />
                                                        {formatRelativeTime(ticket.updatedAt)}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <Link href={`/admin/helpdesk/${ticket.id}`}>
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
                            <p className="text-sm text-muted-foreground">
                                {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                                    ? 'Try adjusting your filters'
                                    : 'No support tickets have been created yet'}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
