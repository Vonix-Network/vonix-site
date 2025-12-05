'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Heart, Crown, Star, Sparkles, Check, 
  Zap, Shield, Gift, CreditCard, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, getMinotaurBustUrl } from '@/lib/utils';
import Image from 'next/image';

interface DonationRank {
  id: string;
  name: string;
  minAmount: number;
  color: string;
  icon: string;
  perks: string[];
  stripePriceId?: string | null;
  stripeProductId?: string | null;
}

interface RecentDonation {
  id: number;
  minecraftUsername: string | null;
  amount: number;
  message: string | null;
  createdAt: string;
}

interface DonationStats {
  total: number;
  count: number;
}

interface DonatePageClientProps {
  ranks: DonationRank[];
  recentDonations: RecentDonation[];
  stats: DonationStats;
}

// Default ranks if none in database
const defaultRanks: DonationRank[] = [
  {
    id: 'supporter',
    name: 'Supporter',
    minAmount: 5,
    color: '#00D9FF',
    icon: '💙',
    perks: ['Supporter badge', 'Access to supporter chat', 'Custom nickname colors'],
  },
  {
    id: 'champion',
    name: 'Champion',
    minAmount: 15,
    color: '#8B5CF6',
    icon: '💜',
    perks: ['All Supporter perks', 'Priority server queue', 'Exclusive cosmetics', 'Monthly rewards'],
  },
  {
    id: 'legend',
    name: 'Legend',
    minAmount: 30,
    color: '#EC4899',
    icon: '💖',
    perks: ['All Champion perks', 'Custom title', 'VIP events access', 'Direct staff support'],
  },
  {
    id: 'mythic',
    name: 'Mythic',
    minAmount: 50,
    color: '#F97316',
    icon: '🔥',
    perks: ['All Legend perks', 'Unique particle effects', 'Server suggestions priority', 'Exclusive Mythic channel'],
  },
];

export function DonatePageClient({ ranks, recentDonations, stats }: DonatePageClientProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loadingRankId, setLoadingRankId] = useState<string | null>(null);
  const [loadingAmount, setLoadingAmount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const displayRanks = ranks.length > 0 ? ranks : defaultRanks;

  const handleSubscribe = async (rank: DonationRank) => {
    if (status !== 'authenticated') {
      router.push('/login?callbackUrl=/donate');
      return;
    }

    setError(null);
    setLoadingRankId(rank.id);

    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rankId: rank.id,
          days: 30, // Monthly subscription
          paymentType: 'subscription',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoadingRankId(null);
    }
  };

  const handleOneTimePayment = async (amount: number) => {
    if (status !== 'authenticated') {
      router.push('/login?callbackUrl=/donate');
      return;
    }

    setError(null);
    setLoadingAmount(amount);

    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rankId: 'one-time',
          days: 0,
          amount,
          paymentType: 'one_time',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoadingAmount(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-error/20 border border-error/50 mb-4 animate-pulse-glow">
          <Heart className="w-10 h-10 text-error" />
        </div>
        <h1 className="text-4xl font-bold gradient-text mb-4">
          Support Vonix Network
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Help us keep the servers running and unlock exclusive perks!
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-md mx-auto mb-8 p-4 rounded-lg bg-error/10 border border-error/30 text-error text-center">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card variant="glass">
          <CardContent className="p-6 text-center">
            <Gift className="w-8 h-8 mx-auto mb-2 text-neon-cyan" />
            <p className="text-3xl font-bold">{formatCurrency(stats.total)}</p>
            <p className="text-muted-foreground">Total Raised</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-6 text-center">
            <Heart className="w-8 h-8 mx-auto mb-2 text-error" />
            <p className="text-3xl font-bold">{stats.count}</p>
            <p className="text-muted-foreground">Donations</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-6 text-center">
            <Crown className="w-8 h-8 mx-auto mb-2 text-neon-orange" />
            <p className="text-3xl font-bold">{displayRanks.length}</p>
            <p className="text-muted-foreground">Rank Tiers</p>
          </CardContent>
        </Card>
      </div>

      {/* Donation Ranks */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-center mb-8">Subscription Ranks</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayRanks.map((rank) => (
            <Card 
              key={rank.id} 
              variant="glass" 
              hover
              className="relative overflow-hidden"
              style={{ borderColor: `${rank.color}50` }}
            >
              {/* Glow effect */}
              <div 
                className="absolute inset-0 opacity-10"
                style={{ background: `radial-gradient(circle at top, ${rank.color}, transparent 70%)` }}
              />
              
              <CardHeader className="text-center relative">
                <div 
                  className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl"
                  style={{ 
                    background: `${rank.color}20`,
                    border: `2px solid ${rank.color}50`,
                  }}
                >
                  {rank.icon || <Star className="w-8 h-8" style={{ color: rank.color }} />}
                </div>
                <CardTitle style={{ color: rank.color }}>{rank.name}</CardTitle>
                <CardDescription>
                  <span className="text-2xl font-bold text-foreground">
                    {formatCurrency(rank.minAmount)}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </CardDescription>
              </CardHeader>

              <CardContent className="relative">
                <ul className="space-y-2 mb-6">
                  {rank.perks.map((perk, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: rank.color }} />
                      <span className="text-muted-foreground">{perk}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  variant="neon-outline" 
                  className="w-full"
                  style={{ borderColor: rank.color, color: rank.color }}
                  onClick={() => handleSubscribe(rank)}
                  disabled={loadingRankId === rank.id}
                >
                  {loadingRankId === rank.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-2" />
                  )}
                  {loadingRankId === rank.id ? 'Processing...' : 'Subscribe'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* One-time Donation */}
      <Card variant="gradient" className="mb-12">
        <CardContent className="py-8 text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-neon-cyan" />
          <h2 className="text-2xl font-bold mb-4">One-Time Donation</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Prefer a one-time contribution? Every donation helps keep our servers running!
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {[5, 10, 25, 50, 100].map((amount) => (
              <Button 
                key={amount} 
                variant="glass" 
                size="lg"
                onClick={() => handleOneTimePayment(amount)}
                disabled={loadingAmount === amount}
              >
                {loadingAmount === amount ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                {formatCurrency(amount)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Donations */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-error" />
            Recent Supporters
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentDonations.length > 0 ? (
            <div className="space-y-3">
              {recentDonations.map((donation) => (
                <div
                  key={donation.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 relative overflow-hidden rounded-lg bg-secondary">
                      {donation.minecraftUsername ? (
                        <Image
                          src={getMinotaurBustUrl(donation.minecraftUsername)}
                          alt={donation.minecraftUsername}
                          width={48}
                          height={48}
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-neon-purple/20">
                          <Heart className="w-5 h-5 text-neon-purple" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">
                          {donation.minecraftUsername || 'Anonymous'}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {new Date(donation.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      {donation.message && (
                        <p className="text-sm text-muted-foreground break-words">
                          &quot;{donation.message}&quot;
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant="neon">{formatCurrency(donation.amount)}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No donations yet. Be the first to support us!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trust Badges */}
      <div className="mt-12 text-center">
        <div className="flex flex-wrap justify-center gap-8 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-success" />
            <span className="text-sm">Secure Payments</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-neon-orange" />
            <span className="text-sm">Instant Activation</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-neon-cyan" />
            <span className="text-sm">Powered by Stripe</span>
          </div>
        </div>
      </div>
    </div>
  );
}
