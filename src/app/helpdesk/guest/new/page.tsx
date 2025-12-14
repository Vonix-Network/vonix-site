'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Loader2, AlertCircle, Tag, Flag, Mail, User, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const categories = [
    { value: 'account', label: 'Account Issues', description: 'Login, password, profile problems' },
    { value: 'billing', label: 'Billing & Donations', description: 'Payment, ranks, subscriptions' },
    { value: 'technical', label: 'Technical Support', description: 'Bugs, errors, connectivity' },
    { value: 'general', label: 'General', description: 'Questions and feedback' },
    { value: 'other', label: 'Other', description: 'Anything else' },
];

const priorities = [
    { value: 'low', label: 'Low', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
    { value: 'normal', label: 'Normal', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    { value: 'high', label: 'High', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
];

export default function NewGuestTicketPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [ticketId, setTicketId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        email: '',
        name: '',
        subject: '',
        category: 'general',
        priority: 'normal',
        message: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate
        if (!formData.email.trim() || !formData.name.trim() || !formData.subject.trim() || !formData.message.trim()) {
            setError('Please fill in all required fields');
            return;
        }

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('Please enter a valid email address');
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await fetch('/api/tickets/guest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setSuccess(true);
                setTicketId(data.ticket.id);
            } else {
                setError(data.error || 'Failed to create ticket');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-background">
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
                                <h1 className="text-2xl font-bold gradient-text">Ticket Created!</h1>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-4 py-8 max-w-2xl">
                    <Card variant="glass">
                        <CardContent className="p-8 text-center">
                            <div className="inline-flex items-center justify-center p-4 rounded-full bg-green-500/20 border border-green-500/30 mb-6">
                                <CheckCircle className="w-12 h-12 text-green-400" />
                            </div>
                            <h2 className="text-2xl font-bold mb-4">Ticket #{ticketId} Created!</h2>
                            <p className="text-muted-foreground mb-6">
                                We've sent an email to <strong className="text-foreground">{formData.email}</strong> with a link to access your ticket.
                            </p>
                            <div className="p-4 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 mb-6">
                                <p className="text-sm text-neon-cyan">
                                    📧 Check your email inbox (and spam folder) for the access link.
                                </p>
                            </div>
                            <div className="flex gap-4 justify-center">
                                <Link href="/helpdesk">
                                    <Button variant="outline">Back to Help Desk</Button>
                                </Link>
                                <Link href="/helpdesk/guest">
                                    <Button variant="neon">
                                        <Mail className="w-4 h-4 mr-2" />
                                        Access My Ticket
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

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
                            <h1 className="text-2xl font-bold gradient-text">Create Guest Ticket</h1>
                            <p className="text-sm text-muted-foreground">
                                Submit a support request without creating an account
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
                            Provide your contact information and describe your issue. We'll send an email with a link to access your ticket.
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

                            {/* Contact Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address *</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="your@email.com"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="pl-10"
                                            required
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        We'll send you a link to access your ticket
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="name">Your Name *</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            id="name"
                                            type="text"
                                            placeholder="John Doe"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="pl-10"
                                            required
                                            maxLength={100}
                                        />
                                    </div>
                                </div>
                            </div>

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

                            {/* Category */}
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {categories.map((cat) => (
                                        <button
                                            key={cat.value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, category: cat.value })}
                                            className={`p-3 rounded-lg border text-left transition-colors ${formData.category === cat.value
                                                ? 'border-neon-cyan bg-neon-cyan/10'
                                                : 'border-border hover:border-neon-cyan/50'
                                                }`}
                                        >
                                            <p className="font-medium text-sm">{cat.label}</p>
                                            <p className="text-xs text-muted-foreground">{cat.description}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Priority */}
                            <div className="space-y-2">
                                <Label>Priority</Label>
                                <div className="flex flex-wrap gap-2">
                                    {priorities.map((p) => (
                                        <button
                                            key={p.value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, priority: p.value })}
                                            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${formData.priority === p.value
                                                ? p.color + ' border-current'
                                                : 'border-border text-muted-foreground hover:border-muted-foreground'
                                                }`}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Message */}
                            <div className="space-y-2">
                                <Label htmlFor="message">Message *</Label>
                                <Textarea
                                    id="message"
                                    placeholder="Please describe your issue in detail..."
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    rows={6}
                                    required
                                    maxLength={5000}
                                />
                                <p className="text-xs text-muted-foreground">
                                    {formData.message.length}/5000 characters
                                </p>
                            </div>

                            {/* Submit */}
                            <div className="flex items-center justify-between pt-4 border-t border-border">
                                <p className="text-xs text-muted-foreground">
                                    * Required fields
                                </p>
                                <Button
                                    type="submit"
                                    variant="neon"
                                    disabled={isSubmitting}
                                    className="gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Creating Ticket...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Submit Ticket
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Already have a ticket? */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-muted-foreground mb-2">Already submitted a ticket?</p>
                    <Link href="/helpdesk/guest">
                        <Button variant="outline" className="gap-2">
                            <Mail className="w-4 h-4" />
                            Access My Ticket
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
