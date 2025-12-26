'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Bell, Save, Loader2, ArrowLeft, Send, Info, AlertTriangle, CheckCircle, XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleCard } from '@/components/ui/toggle-switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const typeIcons = {
    info: Info,
    warning: AlertTriangle,
    success: CheckCircle,
    error: XCircle,
};

const typeColors = {
    info: 'text-neon-cyan bg-neon-cyan/10 border-neon-cyan/30',
    warning: 'text-warning bg-warning/10 border-warning/30',
    success: 'text-success bg-success/10 border-success/30',
    error: 'text-error bg-error/10 border-error/30',
};

export default function NewAnnouncementPage() {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        type: 'info' as 'info' | 'warning' | 'success' | 'error',
        published: true,
        sendNotification: true,
        expiresAt: '',
    });

    const handleSubmit = async () => {
        if (!formData.title || !formData.content) {
            toast.error('Title and content are required');
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/announcements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : null,
                }),
            });

            if (res.ok) {
                toast.success('Announcement created successfully!');
                if (formData.sendNotification) {
                    toast.success('Notifications sent to all users');
                }
                router.push('/admin/announcements');
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to create announcement');
            }
        } catch (error: any) {
            toast.error('Failed to create announcement');
        } finally {
            setIsSaving(false);
        }
    };

    const TypeIcon = typeIcons[formData.type];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Create Announcement</h1>
                    <p className="text-muted-foreground">
                        Create a new announcement and notify users
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Form */}
                <div className="lg:col-span-2 space-y-6">
                    <Card variant="glass">
                        <CardHeader>
                            <CardTitle>Announcement Details</CardTitle>
                            <CardDescription>
                                Write your announcement message
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Title *</label>
                                <Input
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g., Server Maintenance Scheduled"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Content *</label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    placeholder="Write your announcement content here..."
                                    className="w-full min-h-[200px] px-3 py-2 rounded-lg bg-secondary/50 border border-border focus:outline-none focus:ring-2 focus:ring-neon-cyan resize-y"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Announcement Type</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {(['info', 'warning', 'success', 'error'] as const).map((type) => {
                                        const Icon = typeIcons[type];
                                        return (
                                            <button
                                                key={type}
                                                onClick={() => setFormData({ ...formData, type })}
                                                className={`p-3 rounded-lg border transition-all flex items-center justify-center gap-2 capitalize ${formData.type === type
                                                    ? typeColors[type]
                                                    : 'border-border hover:border-muted-foreground'
                                                    }`}
                                            >
                                                <Icon className="w-4 h-4" />
                                                {type}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Expires At (Optional)</label>
                                <Input
                                    type="datetime-local"
                                    value={formData.expiresAt}
                                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Leave empty for no expiration
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card variant="glass">
                        <CardHeader>
                            <CardTitle>Publishing Options</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ToggleCard
                                checked={formData.published}
                                onChange={(val) => setFormData({ ...formData, published: val })}
                                label="Publish Immediately"
                                description="Make the announcement visible right away"
                            />

                            <ToggleCard
                                checked={formData.sendNotification}
                                onChange={(val) => setFormData({ ...formData, sendNotification: val })}
                                label="Send Notification"
                                description="Notify all users about this announcement"
                            />
                        </CardContent>
                    </Card>

                    {/* Preview */}
                    <Card variant="glass">
                        <CardHeader>
                            <CardTitle>Preview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={`p-4 rounded-lg border ${typeColors[formData.type]}`}>
                                <div className="flex items-start gap-3">
                                    <TypeIcon className="w-5 h-5 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold">
                                            {formData.title || 'Announcement Title'}
                                        </h4>
                                        <p className="text-sm mt-1 opacity-80 line-clamp-3">
                                            {formData.content || 'Your announcement content will appear here...'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <Card variant="gradient">
                        <CardContent className="p-4 space-y-3">
                            <Button
                                variant="glass"
                                className="w-full"
                                onClick={handleSubmit}
                                disabled={isSaving || !formData.title || !formData.content}
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4 mr-2" />
                                        Create Announcement
                                    </>
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full"
                                onClick={() => router.back()}
                            >
                                Cancel
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

