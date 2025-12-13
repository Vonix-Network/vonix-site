'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Bell, Plus, Edit, Trash2, Loader2, Info, AlertTriangle, CheckCircle, XCircle, Eye, EyeOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';

interface Announcement {
    id: number;
    title: string;
    content: string;
    type: 'info' | 'warning' | 'success' | 'error';
    published: boolean;
    sendNotification: boolean;
    expiresAt: Date | null;
    createdAt: Date;
    authorUsername?: string;
}

const typeIcons = {
    info: Info,
    warning: AlertTriangle,
    success: CheckCircle,
    error: XCircle,
};

const typeBadges = {
    info: 'neon-cyan',
    warning: 'warning',
    success: 'success',
    error: 'error',
} as const;

export default function AnnouncementsPage() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        try {
            const res = await fetch('/api/admin/announcements');
            if (res.ok) {
                const data = await res.json();
                setAnnouncements(data.announcements || []);
            }
        } catch (error) {
            console.error('Failed to fetch announcements:', error);
            toast.error('Failed to load announcements');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this announcement?')) return;

        try {
            const res = await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Announcement deleted');
                fetchAnnouncements();
            } else {
                toast.error('Failed to delete announcement');
            }
        } catch (error) {
            toast.error('Failed to delete announcement');
        }
    };

    const togglePublished = async (id: number, published: boolean) => {
        try {
            const res = await fetch(`/api/admin/announcements/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ published: !published }),
            });
            if (res.ok) {
                toast.success(published ? 'Announcement unpublished' : 'Announcement published');
                fetchAnnouncements();
            } else {
                toast.error('Failed to update announcement');
            }
        } catch (error) {
            toast.error('Failed to update announcement');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold gradient-text mb-2">Announcements</h1>
                    <p className="text-muted-foreground">
                        Manage site-wide announcements and notifications
                    </p>
                </div>
                <Link href="/admin/announcements/new">
                    <Button variant="gradient">
                        <Plus className="w-4 h-4 mr-2" />
                        New Announcement
                    </Button>
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card variant="glass">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-neon-cyan/20">
                                <Bell className="w-5 h-5 text-neon-cyan" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{announcements.length}</p>
                                <p className="text-sm text-muted-foreground">Total Announcements</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card variant="glass">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-success/20">
                                <Eye className="w-5 h-5 text-success" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {announcements.filter(a => a.published).length}
                                </p>
                                <p className="text-sm text-muted-foreground">Published</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card variant="glass">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-warning/20">
                                <EyeOff className="w-5 h-5 text-warning" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {announcements.filter(a => !a.published).length}
                                </p>
                                <p className="text-sm text-muted-foreground">Draft</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Announcements List */}
            <Card variant="glass">
                <CardHeader>
                    <CardTitle>All Announcements</CardTitle>
                    <CardDescription>Click to edit, manage visibility and delete announcements</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
                        </div>
                    ) : announcements.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No announcements yet</p>
                            <Link href="/admin/announcements/new">
                                <Button variant="neon" className="mt-4">Create First Announcement</Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {announcements.map((announcement) => {
                                const TypeIcon = typeIcons[announcement.type];
                                return (
                                    <div
                                        key={announcement.id}
                                        className="flex items-start gap-4 p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                                    >
                                        <div className={`p-2 rounded-lg bg-${typeBadges[announcement.type]}/20`}>
                                            <TypeIcon className={`w-5 h-5 text-${typeBadges[announcement.type]}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold truncate">{announcement.title}</h3>
                                                <Badge variant={typeBadges[announcement.type]} className="capitalize text-xs">
                                                    {announcement.type}
                                                </Badge>
                                                {announcement.published ? (
                                                    <Badge variant="success" className="text-xs">Published</Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="text-xs">Draft</Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {announcement.content}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                {formatRelativeTime(announcement.createdAt)}
                                                {announcement.expiresAt && (
                                                    <> · Expires {formatRelativeTime(announcement.expiresAt)}</>
                                                )}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => togglePublished(announcement.id, announcement.published)}
                                                title={announcement.published ? 'Unpublish' : 'Publish'}
                                            >
                                                {announcement.published ? (
                                                    <EyeOff className="w-4 h-4" />
                                                ) : (
                                                    <Eye className="w-4 h-4" />
                                                )}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(announcement.id)}
                                                className="text-error hover:text-error"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

