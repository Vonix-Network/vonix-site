'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    LifeBuoy, MessageSquare, Clock, CheckCircle, AlertCircle,
    Plus, Eye, Archive, Tag, Calendar, Loader2, ArrowRight,
    HelpCircle, FileText, Sparkles
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
}

const statusConfig: Record<string, { color: string; icon: any; label: string; bgColor: string }> = {
    open: { color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/30', icon: AlertCircle, label: 'Open' },
    in_progress: { color: 'text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/30', icon: Clock, label: 'In Progress' },
    waiting: { color: 'text-purple-400', bgColor: 'bg-purple-500/10 border-purple-500/30', icon: MessageSquare, label: 'Awaiting Reply' },
    resolved: { color: 'text-green-400', bgColor: 'bg-green-500/10 border-green-500/30', icon: CheckCircle, label: 'Resolved' },
    closed: { color: 'text-gray-400', bgColor: 'bg-gray-500/10 border-gray-500/30', icon: Archive, label: 'Closed' },
};

const priorityConfig: Record<string, { color: string; label: string }> = {
    low: { color: 'bg-gray-500/20 text-gray-400', label: 'Low' },
    normal: { color: 'bg-blue-500/20 text-blue-400', label: 'Normal' },
    high: { color: 'bg-orange-500/20 text-orange-400', label: 'High' },
    urgent: { color: 'bg-red-500/20 text-red-400 animate-pulse', label: 'Urgent' },
};

const categories = [
    { id: 'general', label: 'General', icon: HelpCircle, description: 'General questions and inquiries' },
    { id: 'account', label: 'Account', icon: FileText, description: 'Account-related issues' },
    { id: 'billing', label: 'Billing', icon: Sparkles, description: 'Payment and donation inquiries' },
    { id: 'technical', label: 'Technical', icon: LifeBuoy, description: 'Technical support and bugs' },
];

export default function UserHelpdeskPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [tickets, setTickets] = useState<TicketData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Allow guests to view the page - only fetch tickets if authenticated
        if (status === 'authenticated') {
            fetchTickets();
        } else if (status === 'unauthenticated') {
            setIsLoading(false); // Stop loading for guests
        }
    }, [status]);

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

    if (status === 'loading' || isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-neon-cyan mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading your tickets...</p>
                </div>
            </div>
        );
    }

    const activeTickets = tickets.filter((t: any) => !['closed', 'resolved'].includes(t.status));
    const closedTickets = tickets.filter((t: any) => ['closed', 'resolved'].includes(t.status));

    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section */}
            <div className="relative overflow-hidden border-b border-border">
                <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/5 via-transparent to-neon-purple/5" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neon-cyan/10 via-transparent to-transparent" />

                <div className="container mx-auto px-4 py-16 relative">
                    <div className="max-w-3xl mx-auto text-center">
                        <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/30 mb-6">
                            <LifeBuoy className="w-10 h-10 text-neon-cyan" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            <span className="gradient-text">Help Center</span>
                        </h1>
                        <p className="text-lg text-muted-foreground mb-8">
                            Need assistance? We're here to help. Create a support ticket and our team will get back to you as soon as possible.
                        </p>
                        <div className="flex flex-wrap gap-4 justify-center">
                            <Link href="/helpdesk/new">
                                <Button variant="neon" size="lg" className="gap-2 text-lg px-8">
                                    <Plus className="w-5 h-5" />
                                    Create New Ticket
                                </Button>
                            </Link>
                        </div>
                        <p className="text-sm text-muted-foreground mt-4">
                            Don't have an account?{' '}
                            <Link href="/helpdesk/guest/new" className="text-neon-cyan hover:underline">
                                Create a guest ticket
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-12">
                {/* Quick Categories */}
                <div className="mb-12">
                    <h2 className="text-2xl font-bold mb-6 text-center">How can we help you?</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {categories.map((cat: any) => (
                            <Link key={cat.id} href={`/helpdesk/new?category=${cat.id}`}>
                                <Card variant="glass" className="h-full hover:border-neon-cyan/50 transition-all cursor-pointer group">
                                    <CardContent className="p-6 text-center">
                                        <div className="inline-flex items-center justify-center p-3 rounded-xl bg-secondary/50 mb-4 group-hover:bg-neon-cyan/10 transition-colors">
                                            <cat.icon className="w-6 h-6 text-muted-foreground group-hover:text-neon-cyan transition-colors" />
                                        </div>
                                        <h3 className="font-semibold mb-2 group-hover:text-neon-cyan transition-colors">{cat.label}</h3>
                                        <p className="text-sm text-muted-foreground">{cat.description}</p>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Active Tickets */}
                {activeTickets.length > 0 && (
                    <div className="mb-12">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/20">
                                    <AlertCircle className="w-5 h-5 text-blue-400" />
                                </div>
                                Active Tickets
                                <Badge className="bg-blue-500/20 text-blue-400">{activeTickets.length}</Badge>
                            </h2>
                        </div>
                        <div className="grid gap-4">
                            {activeTickets.map((ticket: any) => {
                                const statusInfo = statusConfig[ticket.status] || statusConfig.open;
                                const priorityInfo = priorityConfig[ticket.priority] || priorityConfig.normal;
                                const StatusIcon = statusInfo.icon;

                                return (
                                    <Link key={ticket.id} href={`/helpdesk/${ticket.id}`}>
                                        <Card variant="glass" className={`hover:border-neon-cyan/50 transition-all cursor-pointer ${statusInfo.bgColor}`}>
                                            <CardContent className="p-6">
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <span className="text-sm font-mono text-muted-foreground">#{ticket.id}</span>
                                                            <Badge className={priorityInfo.color}>{priorityInfo.label}</Badge>
                                                        </div>
                                                        <h3 className="font-semibold text-lg mb-2">{ticket.subject}</h3>
                                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                            <span className="flex items-center gap-1">
                                                                <Tag className="w-3 h-3" />
                                                                {ticket.category}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="w-3 h-3" />
                                                                Updated {formatRelativeTime(ticket.updatedAt)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${statusInfo.bgColor}`}>
                                                            <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                                                            <span className={`font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                                                        </div>
                                                        <ArrowRight className="w-5 h-5 text-muted-foreground" />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Closed Tickets */}
                {closedTickets.length > 0 && (
                    <div className="mb-12">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-green-500/20">
                                    <CheckCircle className="w-5 h-5 text-green-400" />
                                </div>
                                Resolved Tickets
                                <Badge className="bg-gray-500/20 text-gray-400">{closedTickets.length}</Badge>
                            </h2>
                        </div>
                        <div className="grid gap-3">
                            {closedTickets.slice(0, 5).map((ticket: any) => {
                                const statusInfo = statusConfig[ticket.status] || statusConfig.closed;
                                const StatusIcon = statusInfo.icon;

                                return (
                                    <Link key={ticket.id} href={`/helpdesk/${ticket.id}`}>
                                        <Card variant="glass" className="hover:border-border/50 transition-all cursor-pointer opacity-70 hover:opacity-100">
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-sm font-mono text-muted-foreground">#{ticket.id}</span>
                                                        <span className="font-medium">{ticket.subject}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                                                        <span className="text-sm text-muted-foreground">
                                                            {formatRelativeTime(ticket.updatedAt)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                );
                            })}
                            {closedTickets.length > 5 && (
                                <p className="text-center text-sm text-muted-foreground py-2">
                                    And {closedTickets.length - 5} more resolved tickets...
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {tickets.length === 0 && (
                    <Card variant="glass" className="max-w-2xl mx-auto">
                        <CardContent className="p-12 text-center">
                            <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-secondary/50 mb-6">
                                <LifeBuoy className="w-12 h-12 text-muted-foreground" />
                            </div>
                            <h3 className="text-2xl font-bold mb-3">No tickets yet</h3>
                            <p className="text-muted-foreground mb-8">
                                You haven't created any support tickets. If you need help, we're just a click away!
                            </p>
                            <Link href="/helpdesk/new">
                                <Button variant="neon" size="lg" className="gap-2">
                                    <Plus className="w-5 h-5" />
                                    Create Your First Ticket
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}

                {/* Help Section */}
                <Card variant="glass" className="mt-12">
                    <CardContent className="p-8">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-neon-purple/20">
                                    <MessageSquare className="w-8 h-8 text-neon-purple" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Need immediate help?</h3>
                                    <p className="text-muted-foreground">Join our Discord community for real-time support</p>
                                </div>
                            </div>
                            <a href="https://discord.gg/vonix" target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" className="gap-2">
                                    Join Discord
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </a>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
