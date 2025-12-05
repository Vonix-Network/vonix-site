'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle, Crown, Sparkles, ArrowRight,
  Download, Mail, Home
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// Dynamically import confetti to avoid SSR issues
const triggerConfetti = async () => {
  const confetti = (await import('canvas-confetti')).default;
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#00D9FF', '#8B5CF6', '#EC4899', '#F97316'],
  });
};

interface PaymentDetails {
  rankName: string;
  amount: number;
  days: number;
  expiresAt: string;
}

export default function DonationSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get('session_id');
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Trigger confetti on mount
    triggerConfetti();

    // Verify session and get details
    if (sessionId) {
      verifySession();
    } else {
      setIsLoading(false);
    }
  }, [sessionId]);

  const verifySession = async () => {
    try {
      const res = await fetch(`/api/stripe/verify-session?session_id=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setPaymentDetails(data);
      }
    } catch (err) {
      console.error('Failed to verify session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      {/* Success Animation */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-success/20 border-4 border-success mb-6 animate-bounce">
          <CheckCircle className="w-12 h-12 text-success" />
        </div>

        <h1 className="text-4xl font-bold gradient-text mb-4">
          Thank You!
        </h1>

        <p className="text-xl text-muted-foreground">
          Your donation has been processed successfully
        </p>
      </div>

      {/* Payment Details */}
      <Card variant="neon-glow" className="mb-8">
        <CardContent className="p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neon-orange/20 border border-neon-orange/50 mb-4">
            <Crown className="w-8 h-8 text-neon-orange" />
          </div>

          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-secondary rounded w-48 mx-auto" />
              <div className="h-4 bg-secondary rounded w-32 mx-auto" />
            </div>
          ) : paymentDetails ? (
            <>
              <h2 className="text-2xl font-bold mb-2">
                {paymentDetails.rankName} Rank Activated!
              </h2>
              <div className="flex items-center justify-center gap-4 mb-4">
                <Badge variant="neon" className="text-lg px-4 py-1">
                  ${paymentDetails.amount}
                </Badge>
                <Badge variant="secondary" className="text-lg px-4 py-1">
                  {paymentDetails.days} days
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Your rank is active until{' '}
                <span className="text-foreground font-medium">
                  {new Date(paymentDetails.expiresAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-2">
                Rank Activated!
              </h2>
              <p className="text-muted-foreground">
                Your new rank has been applied to your account
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* What's Next */}
      <Card variant="glass" className="mb-8">
        <CardContent className="p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-neon-cyan" />
            What&apos;s Next?
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-success mt-0.5" />
              <div>
                <p className="font-medium">Your rank is now active</p>
                <p className="text-sm text-muted-foreground">
                  All perks and benefits are available immediately
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-success mt-0.5" />
              <div>
                <p className="font-medium">Join our Minecraft servers</p>
                <p className="text-sm text-muted-foreground">
                  Your rank will be synced automatically when you join
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-success mt-0.5" />
              <div>
                <p className="font-medium">Check your email</p>
                <p className="text-sm text-muted-foreground">
                  We&apos;ve sent a receipt to your email address
                </p>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link href="/dashboard" className="flex-1">
          <Button variant="gradient" className="w-full" size="lg">
            <Home className="w-4 h-4 mr-2" />
            Go to Dashboard
          </Button>
        </Link>
        <Link href="/servers" className="flex-1">
          <Button variant="neon-outline" className="w-full" size="lg">
            Play Now
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      {/* Support */}
      <p className="text-center text-sm text-muted-foreground mt-8">
        Questions about your purchase?{' '}
        <Link href="/support" className="text-neon-cyan hover:underline">
          Contact Support
        </Link>
      </p>
    </div>
  );
}
