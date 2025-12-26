'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Ticket, ArrowLeft, Send, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

export default function NewTicketPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        subject: '',
        category: 'general',
        priority: 'normal',
        message: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!form.subject.trim() || !form.message.trim()) {
            setError('Please fill in all required fields');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });

            const data = await res.json();

            if (res.ok) {
                router.push(`/support/${data.ticket.id}`);
            } else {
                setError(data.error || 'Failed to create ticket');
            }
        } catch {
            setError('Something went wrong');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            {/* Header */}
            <div className="mb-8">
                <Link href="/support" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Support
                </Link>
                <h1 className="text-3xl font-bold gradient-text mb-2">New Support Ticket</h1>
                <p className="text-muted-foreground">
                    Describe your issue and we&apos;ll help you as soon as possible.
                </p>
            </div>

            <Card variant="glass">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Ticket className="w-5 h-5 text-neon-cyan" />
                        Create Ticket
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-3 rounded-lg bg-error/10 border border-error/50 text-error text-sm">
                                {error}
                            </div>
                        )}

                        {/* Subject */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Subject *</label>
                            <Input
                                placeholder="Brief summary of your issue"
                                value={form.subject}
                                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                                maxLength={100}
                            />
                        </div>

                        {/* Category */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Category</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {categories.map((cat: any) => (
                                    <button
                                        key={cat.value}
                                        type="button"
                                        onClick={() => setForm({ ...form, category: cat.value })}
                                        className={`p-3 rounded-lg border text-left transition-colors ${form.category === cat.value
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
                            <label className="text-sm font-medium">Priority</label>
                            <div className="flex gap-2">
                                {priorities.map((p: any) => (
                                    <button
                                        key={p.value}
                                        type="button"
                                        onClick={() => setForm({ ...form, priority: p.value })}
                                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${form.priority === p.value
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
                            <label className="text-sm font-medium">Message *</label>
                            <textarea
                                placeholder="Describe your issue in detail. Include any relevant information that might help us assist you."
                                value={form.message}
                                onChange={(e) => setForm({ ...form, message: e.target.value })}
                                className="w-full bg-secondary/50 border border-border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 min-h-[150px]"
                            />
                        </div>

                        {/* Submit */}
                        <div className="flex justify-end">
                            <Button type="submit" variant="gradient" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4 mr-2" />
                                        Submit Ticket
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
