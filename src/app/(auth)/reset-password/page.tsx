'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Loader2, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const token = searchParams?.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword: password }),
            });

            const data = await res.json();

            if (res.ok) {
                setIsSuccess(true);
            } else {
                setError(data.error || 'Failed to reset password');
            }
        } catch (err) {
            setError('Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="text-center space-y-4">
                <div className="flex justify-center">
                    <div className="p-4 rounded-full bg-error/20">
                        <XCircle className="w-12 h-12 text-error" />
                    </div>
                </div>
                <p className="text-muted-foreground">
                    Invalid or missing reset token. Please request a new password reset.
                </p>
                <Button variant="neon" asChild>
                    <Link href="/forgot-password">Request New Link</Link>
                </Button>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className="text-center space-y-6">
                <div className="flex justify-center">
                    <div className="p-4 rounded-full bg-success/20">
                        <CheckCircle className="w-12 h-12 text-success" />
                    </div>
                </div>
                <div>
                    <h3 className="text-xl font-semibold text-success">Password Reset!</h3>
                    <p className="text-muted-foreground mt-2">
                        Your password has been reset successfully.
                    </p>
                </div>
                <Button variant="gradient" className="w-full" asChild>
                    <Link href="/login">Sign In</Link>
                </Button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="p-3 rounded-lg bg-error/10 border border-error/50 text-error text-sm">
                    {error}
                </div>
            )}

            <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                    New Password
                </label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter new password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        disabled={isLoading}
                        className="pl-10 pr-10"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirm Password
                </label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        id="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={8}
                        disabled={isLoading}
                        className="pl-10"
                    />
                </div>
            </div>

            <p className="text-xs text-muted-foreground">
                Password must be at least 8 characters long.
            </p>

            <Button
                type="submit"
                variant="gradient"
                className="w-full"
                disabled={isLoading || !password || !confirmPassword}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Resetting...
                    </>
                ) : (
                    <>
                        <Lock className="w-4 h-4" />
                        Reset Password
                    </>
                )}
            </Button>
        </form>
    );
}

export default function ResetPasswordPage() {
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
                                <linearGradient id="resetLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#00D9FF" />
                                    <stop offset="50%" stopColor="#8B5CF6" />
                                    <stop offset="100%" stopColor="#EC4899" />
                                </linearGradient>
                            </defs>
                            <path
                                d="M20 25 L50 85 L80 25"
                                stroke="url(#resetLogoGradient)"
                                strokeWidth="8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>

                    <div>
                        <CardTitle className="text-2xl gradient-text">Reset Password</CardTitle>
                        <CardDescription className="mt-2">
                            Enter your new password below.
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent>
                    <Suspense fallback={<div className="flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
                        <ResetPasswordForm />
                    </Suspense>
                </CardContent>
            </Card>
        </div>
    );
}
