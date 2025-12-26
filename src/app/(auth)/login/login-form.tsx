'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Discord logo SVG component
const DiscordLogo = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
);

interface DiscordSettings {
    enabled: boolean;
    oauthEnabled: boolean;
}

export function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session, status } = useSession();
    const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard';
    const error = searchParams?.get('error');

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isDiscordLoading, setIsDiscordLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState(error || '');
    const [discordSettings, setDiscordSettings] = useState<DiscordSettings | null>(null);

    // Fetch Discord OAuth settings
    useEffect(() => {
        const fetchDiscordSettings = async () => {
            try {
                const res = await fetch('/api/settings/discord-oauth');
                if (res.ok) {
                    const data = await res.json();
                    setDiscordSettings(data);
                }
            } catch {
                // Silently fail - Discord OAuth just won't be shown
            }
        };
        fetchDiscordSettings();
    }, []);

    // Redirect if already logged in
    useEffect(() => {
        if (status === 'authenticated' && session) {
            router.push(callbackUrl);
            router.refresh();
        }
    }, [status, session, router, callbackUrl]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMessage('');

        try {
            const result = await signIn('credentials', {
                username,
                password,
                redirect: false,
            });

            if (result?.error) {
                setErrorMessage(result.error === 'CredentialsSignin'
                    ? 'Invalid username or password'
                    : result.error);
            } else if (result?.ok) {
                // Force a hard navigation to ensure session is loaded
                window.location.href = callbackUrl;
            }
        } catch (error: any) {
            setErrorMessage('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDiscordLogin = async () => {
        setIsDiscordLoading(true);
        setErrorMessage('');
        try {
            window.location.href = `/api/auth/discord?callbackUrl=${encodeURIComponent(callbackUrl)}`;
        } catch (error: any) {
            setErrorMessage('Failed to initiate Discord login');
            setIsDiscordLoading(false);
        }
    };

    // Show loading state while checking session
    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
            </div>
        );
    }

    // Don't render form if authenticated (will redirect)
    if (status === 'authenticated') {
        return null;
    }

    const showDiscordLogin = discordSettings?.oauthEnabled === true;

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12">
            {/* ========== VISIBLE GRADIENT EFFECTS ========== */}
            <div
                className="fixed inset-0 pointer-events-none"
                style={{
                    background: `
                        radial-gradient(ellipse 80% 70% at 0% 40%, rgba(0, 217, 255, 0.18) 0%, transparent 55%),
                        radial-gradient(ellipse 70% 60% at 100% 30%, rgba(139, 92, 246, 0.12) 0%, transparent 50%),
                        radial-gradient(ellipse 60% 50% at 60% 90%, rgba(236, 72, 153, 0.08) 0%, transparent 45%)
                    `
                }}
            />

            {/* Large glow orbs */}
            <div className="fixed top-1/4 -left-32 w-[700px] h-[700px] bg-neon-cyan/20 rounded-full blur-[160px] pointer-events-none" />
            <div className="fixed bottom-1/3 -right-32 w-[600px] h-[600px] bg-neon-purple/15 rounded-full blur-[140px] pointer-events-none" />

            <Card variant="glass" className="w-full max-w-md relative z-10">
                <CardHeader className="text-center space-y-4">
                    {/* Logo */}
                    <div className="mx-auto w-16 h-16">
                        <svg viewBox="0 0 100 100" fill="none">
                            <defs>
                                <linearGradient id="loginLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#00D9FF" />
                                    <stop offset="50%" stopColor="#8B5CF6" />
                                    <stop offset="100%" stopColor="#EC4899" />
                                </linearGradient>
                            </defs>
                            <path
                                d="M20 25 L50 85 L80 25"
                                stroke="url(#loginLogoGradient)"
                                strokeWidth="8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>

                    <div>
                        <CardTitle className="text-2xl gradient-text">Welcome Back</CardTitle>
                        <CardDescription className="mt-2">
                            Sign in to your Vonix Network account
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {errorMessage && (
                            <div className="p-3 rounded-lg bg-error/10 border border-error/50 text-error text-sm">
                                {decodeURIComponent(errorMessage)}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label htmlFor="username" className="text-sm font-medium">
                                Username
                            </label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="Enter your username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                autoComplete="username"
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label htmlFor="password" className="text-sm font-medium">
                                    Password
                                </label>
                                <Link href="/forgot-password" className="text-sm text-neon-cyan hover:underline">
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    disabled={isLoading}
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            variant="gradient"
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    <LogIn className="w-4 h-4" />
                                    Sign In
                                </>
                            )}
                        </Button>
                    </form>

                    {/* Discord Login */}
                    {showDiscordLogin && (
                        <>
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-border" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                                </div>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={handleDiscordLogin}
                                disabled={isDiscordLoading}
                                style={{
                                    borderColor: '#5865F2',
                                    color: '#5865F2',
                                }}
                            >
                                {isDiscordLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Connecting...
                                    </>
                                ) : (
                                    <>
                                        <DiscordLogo className="w-5 h-5 mr-2" />
                                        Sign in with Discord
                                    </>
                                )}
                            </Button>
                            <p className="text-xs text-muted-foreground text-center mt-2">
                                Only for accounts with Discord already linked
                            </p>
                        </>
                    )}

                    <div className="mt-6 text-center text-sm text-muted-foreground">
                        Don&apos;t have an account?{' '}
                        <Link href="/register" className="text-neon-cyan hover:underline">
                            Create one
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
