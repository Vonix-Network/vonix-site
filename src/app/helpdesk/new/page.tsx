'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, Loader2, AlertCircle, Tag, Flag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function NewTicketPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        subject: '',
        category: 'general',
        priority: 'normal',
        message: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const res = await fetch('/api/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                const data = await res.json();
                router.push(`/helpdesk/${data.ticket.id}`);
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to create ticket');
            }
        } catch (err: any) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b border-border bg-card/50 backdrop-blur-sm">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Link href="/helpdesk">
                            <Button variant="ghost" size="sm" className="gap-2">
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold gradient-text">Create New Ticket</h1>
                            <p className="text-sm text-muted-foreground">
                                Describe your issue and we'll get back to you soon
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-3xl">
                <Card variant="glass">
                    <CardHeader>
                        <CardTitle>Ticket Details</CardTitle>
                        <CardDescription>
                            Provide as much detail as possible to help us resolve your issue quickly
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-400">{error}</p>
                                </div>
                            )}

                            {/* Subject */}
                            <div className="space-y-2">
                                <Label htmlFor="subject">Subject *</Label>
                                <Input
                                    id="subject"
                                    placeholder="Brief description of your issue"
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    required
                                    maxLength={200}
                                />
                                <p className="text-xs text-muted-foreground">
                                    {formData.subject.length}/200 characters
                                </p>
                            </div>

                            {/* Category and Priority */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="category" className="flex items-center gap-2">
                                        <Tag className="w-4 h-4" />
                                        Category *
                                    </Label>
                                    <select
                                        id="category"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neon-cyan/50"
                                        required
                                    >
                                        <option value="general">General</option>
                                        <option value="account">Account</option>
                                        <option value="billing">Billing</option>
                                        <option value="technical">Technical</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="priority" className="flex items-center gap-2">
                                        <Flag className="w-4 h-4" />
                                        Priority *
                                    </Label>
                                    <select
                                        id="priority"
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neon-cyan/50"
                                        required
                                    >
                                        <option value="low">Low</option>
                                        <option value="normal">Normal</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>
                            </div>

                            {/* Message */}
                            <div className="space-y-2">
                                <Label htmlFor="message">Message *</Label>
                                <Textarea
                                    id="message"
                                    placeholder="Describe your issue in detail..."
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    required
                                    rows={8}
                                    maxLength={5000}
                                />
                                <p className="text-xs text-muted-foreground">
                                    {formData.message.length}/5000 characters
                                </p>
                            </div>

                            {/* Submit Button */}
                            <div className="flex items-center gap-3 pt-4">
                                <Button
                                    type="submit"
                                    variant="neon"
                                    disabled={isSubmitting}
                                    className="gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Create Ticket
                                        </>
                                    )}
                                </Button>
                                <Link href="/helpdesk">
                                    <Button type="button" variant="ghost">
                                        Cancel
                                    </Button>
                                </Link>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Help Tips */}
                <Card variant="glass" className="mt-6">
                    <CardHeader>
                        <CardTitle className="text-lg">Tips for Better Support</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-start gap-2">
                                <span className="text-neon-cyan">•</span>
                                <span>Be specific about the issue you're experiencing</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-neon-cyan">•</span>
                                <span>Include any error messages you've received</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-neon-cyan">•</span>
                                <span>Mention steps you've already tried to resolve the issue</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-neon-cyan">•</span>
                                <span>Choose the correct category and priority for faster response</span>
                            </li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
