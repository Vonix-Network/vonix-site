'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff, UserPlus, Loader2, Check, X, Gamepad2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface DiscordData {
    discordId: string;
    discordUsername: string;
    discordAvatar: string | null;
    email: string;
}

// Discord logo SVG component
const DiscordLogo = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
);

export function CompleteDiscordRegistrationForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session, status } = useSession();

    const [discordData, setDiscordData] = useState<DiscordData | null>(null);
    const [username, setUsername] = useState('');
    const [minecraftUsername, setMinecraftUsername] = useState('');
    const [avatar, setAvatar] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Parse Discord data from URL
    useEffect(() => {
        const dataParam = searchParams?.get('data');
        if (dataParam) {
            try {
                const parsed = JSON.parse(decodeURIComponent(dataParam));
                setDiscordData(parsed);
            } catch (e) {
                setErrorMessage('Invalid Discord data. Please try again.');
            }
        } else {
            setErrorMessage('No Discord data provided. Please register with Discord again.');
        }
    }, [searchParams]);

    // Redirect if already logged in
    useEffect(() => {
        if (status === 'authenticated' && session) {
            router.push('/dashboard');
            router.refresh();
        }
    }, [status, session, router]);

    // Password strength checks
    const passwordChecks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const isPasswordStrong = Object.values(passwordChecks).filter(Boolean).length >= 4;
    const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMessage('');

        if (!discordData) {
            setErrorMessage('No Discord data. Please try again.');
            setIsLoading(false);
            return;
        }

        // Validate username (required)
        const finalUsername = username.trim();
        if (!finalUsername || finalUsername.length < 3 || finalUsername.length > 20) {
            setErrorMessage('Username must be between 3 and 20 characters');
            setIsLoading(false);
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(finalUsername)) {
            setErrorMessage('Username can only contain letters, numbers, and underscores');
            setIsLoading(false);
            return;
        }

        // Validate Minecraft username format if provided (optional)
        const finalMcUsername = minecraftUsername.trim();
        if (finalMcUsername) {
            if (finalMcUsername.length < 3 || finalMcUsername.length > 16) {
                setErrorMessage('Minecraft username must be between 3 and 16 characters');
                setIsLoading(false);
                return;
            }

            if (!/^[a-zA-Z0-9_]+$/.test(finalMcUsername)) {
                setErrorMessage('Minecraft username can only contain letters, numbers, and underscores');
                setIsLoading(false);
                return;
            }
        }

        if (!isPasswordStrong) {
            setErrorMessage('Password does not meet security requirements');
            setIsLoading(false);
            return;
        }

        if (!passwordsMatch) {
            setErrorMessage('Passwords do not match');
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/register-discord', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: finalUsername,
                    minecraftUsername: finalMcUsername || null,
                    avatar: avatar.trim() || null,
                    password,
                    ...discordData,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            router.push('/login?registered=true&discord=true');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const PasswordCheck = ({ passed, label }: { passed: boolean; label: string }) => (
        <div className={`flex items-center gap-2 text-xs ${passed ? 'text-success' : 'text-muted-foreground'}`}>
            {passed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            {label}
        </div>
    );

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

    if (!discordData && !errorMessage) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12">
            {/* Background effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/5 via-neon-purple/5 to-neon-pink/5" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-cyan/10 rounded-full blur-[128px]" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-purple/10 rounded-full blur-[128px]" />

            <Card variant="glass" className="w-full max-w-md relative z-10">
                <CardHeader className="text-center space-y-4">
                    {/* Discord Icon */}
                    <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#5865F2' }}>
                        <DiscordLogo className="w-10 h-10 text-white" />
                    </div>

                    <div>
                        <CardTitle className="text-2xl gradient-text">Complete Registration</CardTitle>
                        <CardDescription className="mt-2">
                            Link your Minecraft account to finish signing up
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent>
                    {/* Discord Account Preview */}
                    {discordData && (
                        <div className="mb-6 p-4 rounded-lg border" style={{ background: 'rgba(88, 101, 242, 0.1)', borderColor: 'rgba(88, 101, 242, 0.3)' }}>
                            <div className="flex items-center gap-3">
                                <Avatar className="w-12 h-12">
                                    {discordData.discordAvatar ? (
                                        <AvatarImage src={discordData.discordAvatar} alt={discordData.discordUsername} />
                                    ) : (
                                        <AvatarFallback style={{ background: '#5865F2' }}>
                                            <DiscordLogo className="w-6 h-6 text-white" />
                                        </AvatarFallback>
                                    )}
                                </Avatar>
                                <div>
                                    <p className="font-medium" style={{ color: '#5865F2' }}>
                                        @{discordData.discordUsername}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Discord Account Connected</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {errorMessage && (
                            <div className="p-3 rounded-lg bg-error/10 border border-error/50 text-error text-sm">
                                {errorMessage}
                            </div>
                        )}

                        {/* Username (Required) */}
                        <div className="space-y-2">
                            <label htmlFor="username" className="text-sm font-medium">
                                Username
                            </label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="Choose a username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                disabled={isLoading}
                                maxLength={20}
                            />
                            <p className="text-xs text-muted-foreground">
                                3-20 characters, letters, numbers, and underscores only
                            </p>
                        </div>

                        {/* Minecraft Username (Optional) */}
                        <div className="space-y-2">
                            <label htmlFor="minecraftUsername" className="text-sm font-medium flex items-center gap-2">
                                <Gamepad2 className="w-4 h-4 text-neon-cyan" />
                                Minecraft Username (Optional)
                            </label>
                            <Input
                                id="minecraftUsername"
                                type="text"
                                placeholder="Your Minecraft username"
                                value={minecraftUsername}
                                onChange={(e) => setMinecraftUsername(e.target.value)}
                                disabled={isLoading}
                                maxLength={16}
                            />
                            <p className="text-xs text-muted-foreground">
                                Your profile will display your Minecraft skin if provided
                            </p>
                        </div>

                        {/* Custom Avatar URL (Optional) - only show if no MC username */}
                        {!minecraftUsername && (
                            <div className="space-y-2">
                                <label htmlFor="avatar" className="text-sm font-medium">
                                    Custom Avatar URL (Optional)
                                </label>
                                <Input
                                    id="avatar"
                                    type="url"
                                    placeholder="https://example.com/avatar.png"
                                    value={avatar}
                                    onChange={(e) => setAvatar(e.target.value)}
                                    disabled={isLoading}
                                />
                                <p className="text-xs text-muted-foreground">Direct URL to an image for your profile</p>
                            </div>
                        )}

                        {/* Password */}
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium">
                                Password
                            </label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Create a strong password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
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

                            {password && (
                                <div className="grid grid-cols-2 gap-1 mt-2">
                                    <PasswordCheck passed={passwordChecks.length} label="8+ characters" />
                                    <PasswordCheck passed={passwordChecks.uppercase} label="Uppercase" />
                                    <PasswordCheck passed={passwordChecks.lowercase} label="Lowercase" />
                                    <PasswordCheck passed={passwordChecks.number} label="Number" />
                                    <PasswordCheck passed={passwordChecks.special} label="Special char" />
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <label htmlFor="confirmPassword" className="text-sm font-medium">
                                Confirm Password
                            </label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="Confirm your password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                            {confirmPassword && !passwordsMatch && (
                                <p className="text-xs text-error">Passwords do not match</p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            variant="gradient"
                            className="w-full"
                            disabled={isLoading || !isPasswordStrong || !passwordsMatch || !username.trim() || !discordData}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating account...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-4 h-4" />
                                    Complete Registration
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm text-muted-foreground">
                        Already have an account?{' '}
                        <Link href="/login" className="text-neon-cyan hover:underline">
                            Sign in
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
