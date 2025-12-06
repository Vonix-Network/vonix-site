'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff, UserPlus, Loader2, Check, X, Gamepad2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getMinotaurBustUrl } from '@/lib/utils';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  // Redirect if already logged in
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push('/dashboard');
      router.refresh();
    }
  }, [status, session, router]);

  // Pre-fill registration code from URL if provided
  const initialCode = searchParams?.get('code') || '';

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    registrationCode: initialCode,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [codeValidation, setCodeValidation] = useState<{
    valid: boolean;
    minecraftUsername?: string;
    minecraftUuid?: string;
    checking: boolean;
    error?: string;
  }>({ valid: false, checking: false });

  // Validate code when 8 characters are entered
  const validateCode = useCallback(async (code: string) => {
    if (code.length !== 8) {
      setCodeValidation({ valid: false, checking: false });
      return;
    }

    setCodeValidation(prev => ({ ...prev, checking: true, error: undefined }));

    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (data.valid) {
        setCodeValidation({
          valid: true,
          minecraftUsername: data.minecraftUsername,
          minecraftUuid: data.minecraftUuid,
          checking: false,
        });
      } else {
        setCodeValidation({
          valid: false,
          checking: false,
          error: data.error || 'Invalid registration code',
        });
      }
    } catch {
      setCodeValidation({
        valid: false,
        checking: false,
        error: 'Failed to verify code',
      });
    }
  }, []);

  // Effect to validate code when it reaches 8 characters
  useEffect(() => {
    const code = formData.registrationCode.trim();
    if (code.length === 8) {
      validateCode(code);
    } else {
      setCodeValidation({ valid: false, checking: false });
    }
  }, [formData.registrationCode, validateCode]);

  // Password strength checks
  const passwordChecks = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    lowercase: /[a-z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
  };

  const isPasswordStrong = Object.values(passwordChecks).filter(Boolean).length >= 4;
  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword.length > 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

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
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      router.push('/login?registered=true');
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
                <linearGradient id="registerLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00D9FF" />
                  <stop offset="50%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#EC4899" />
                </linearGradient>
              </defs>
              <path
                d="M20 25 L50 85 L80 25"
                stroke="url(#registerLogoGradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div>
            <CardTitle className="text-2xl gradient-text">Create Account</CardTitle>
            <CardDescription className="mt-2">
              Link your Minecraft account to Vonix Network
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {/* How it works */}
          <div className="mb-6 p-4 rounded-lg bg-muted/30 border border-border/50">
            <h3 className="text-sm font-semibold mb-2 text-neon-cyan">How to Register</h3>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Join our Minecraft server and type <code className="bg-muted px-1 py-0.5 rounded">/register</code></li>
              <li>Copy the registration code you receive</li>
              <li>Enter the code below and create your password</li>
            </ol>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-lg bg-error/10 border border-error/50 text-error text-sm">
                {errorMessage}
              </div>
            )}

            {/* Registration Code - First Step */}
            <div className="space-y-2">
              <label htmlFor="registrationCode" className="text-sm font-medium flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-neon-cyan" />
                Registration Code
              </label>
              <div className="relative">
                <Input
                  id="registrationCode"
                  name="registrationCode"
                  type="text"
                  placeholder="Enter your 8-character code (e.g., A1B2C3D4)"
                  value={formData.registrationCode}
                  onChange={handleChange}
                  required
                  disabled={isLoading || codeValidation.valid}
                  className="uppercase tracking-widest font-mono text-center text-lg"
                  maxLength={8}
                />
                {codeValidation.checking && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Code validation feedback */}
              {codeValidation.error && formData.registrationCode.length === 8 && (
                <div className="flex items-center gap-2 text-error text-sm">
                  <XCircle className="w-4 h-4" />
                  {codeValidation.error}
                </div>
              )}

              {/* Minecraft Account Preview */}
              {codeValidation.valid && codeValidation.minecraftUsername && codeValidation.minecraftUuid && (
                <div className="mt-4 p-4 rounded-lg bg-success/10 border border-success/30 space-y-3">
                  <div className="flex items-center gap-2 text-success text-sm font-medium">
                    <CheckCircle className="w-4 h-4" />
                    Minecraft Account Found
                  </div>

                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <Image
                        src={getMinotaurBustUrl(codeValidation.minecraftUsername)}
                        alt={`${codeValidation.minecraftUsername}'s skin`}
                        width={64}
                        height={64}
                        className="rounded-lg border border-border"
                        unoptimized
                      />
                    </div>

                    {/* Account details */}
                    <div className="flex-1 space-y-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Username</label>
                        <Input
                          value={codeValidation.minecraftUsername}
                          disabled
                          className="font-mono bg-muted/50"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">UUID</label>
                        <Input
                          value={codeValidation.minecraftUuid}
                          disabled
                          className="font-mono text-xs bg-muted/50"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, registrationCode: '' }));
                      setCodeValidation({ valid: false, checking: false });
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Use a different code
                  </button>
                </div>
              )}

              {!codeValidation.valid && (
                <p className="text-xs text-muted-foreground">
                  Get this code by typing <code className="bg-muted px-1 py-0.5 rounded">/register</code> in-game
                </p>
              )}
            </div>

            {/* Email - Optional */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email (Optional)
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">Used for password recovery and notifications</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={handleChange}
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

              {formData.password && (
                <div className="grid grid-cols-2 gap-1 mt-2">
                  <PasswordCheck passed={passwordChecks.length} label="8+ characters" />
                  <PasswordCheck passed={passwordChecks.uppercase} label="Uppercase" />
                  <PasswordCheck passed={passwordChecks.lowercase} label="Lowercase" />
                  <PasswordCheck passed={passwordChecks.number} label="Number" />
                  <PasswordCheck passed={passwordChecks.special} label="Special char" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={isLoading}
                error={formData.confirmPassword.length > 0 && !passwordsMatch}
              />
              {formData.confirmPassword && !passwordsMatch && (
                <p className="text-xs text-error">Passwords do not match</p>
              )}
            </div>

            <Button
              type="submit"
              variant="gradient"
              className="w-full"
              disabled={isLoading || !isPasswordStrong || !passwordsMatch}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Account
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

