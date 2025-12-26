'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function ForgotPasswordForm() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (res.ok) {
                setIsSubmitted(true);
            } else {
                setError(data.error || 'Something went wrong');
            }
        } catch (err: any) {
            setError('Failed to send reset email');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12">
            {/* Background effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/5 via-neon-purple/5 to-neon-pink/5" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-cyan/10 rounded-full blur-[128px]" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-purple/10 rounded-full blur-[128px]" />

            <Card variant="glass" className="w-full max-w-md relative z-10">
                <CardHeader className="text-center space-y-4">
                    {/* Logo */}
                    <div className="mx-auto w-16 h-16">
                        <svg viewBox="0 0 100 100" fill="none">
                            <defs>
                                <linearGradient id="forgotLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#00D9FF" />
                                    <stop offset="50%" stopColor="#8B5CF6" />
                                    <stop offset="100%" stopColor="#EC4899" />
                                </linearGradient>
                            </defs>
                            <path
                                d="M20 25 L50 85 L80 25"
                                stroke="url(#forgotLogoGradient)"
                                strokeWidth="8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>

                    <div>
                        <CardTitle className="text-2xl gradient-text">
                            {isSubmitted ? 'Check Your Email' : 'Forgot Password?'}
                        </CardTitle>
                        <CardDescription className="mt-2">
                            {isSubmitted
                                ? 'If an account exists with that email, we\'ve sent a password reset link.'
                                : 'Enter your email address and we\'ll send you a reset link.'}
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent>
                    {isSubmitted ? (
                        <div className="space-y-6">
                            <div className="flex justify-center">
                                <div className="p-4 rounded-full bg-success/20">
                                    <CheckCircle className="w-12 h-12 text-success" />
                                </div>
                            </div>
                            <div className="text-center space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Didn't receive an email? Check your spam folder or make sure you entered the correct email.
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    <strong>No email linked?</strong>{' '}
                                    <Link href="/support" className="text-neon-cyan hover:underline">
                                        Contact support
                                    </Link>{' '}
                                    to recover your account.
                                </p>
                            </div>
                            <Button variant="neon-outline" className="w-full" asChild>
                                <Link href="/login">
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back to Login
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-3 rounded-lg bg-error/10 border border-error/50 text-error text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={isLoading}
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                variant="gradient"
                                className="w-full"
                                disabled={isLoading || !email}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Mail className="w-4 h-4" />
                                        Send Reset Link
                                    </>
                                )}
                            </Button>

                            <div className="text-center space-y-2 pt-4">
                                <p className="text-sm text-muted-foreground">
                                    Don't have an email linked?{' '}
                                    <Link href="/support" className="text-neon-cyan hover:underline">
                                        Contact support
                                    </Link>
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Remember your password?{' '}
                                    <Link href="/login" className="text-neon-cyan hover:underline">
                                        Sign in
                                    </Link>
                                </p>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
