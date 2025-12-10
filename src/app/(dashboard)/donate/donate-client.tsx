'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Heart, Crown, Star, Sparkles, Check,
  Zap, Shield, Gift, CreditCard, Loader2, X, Clock, RefreshCw, Calendar,
  Coffee, ExternalLink, AlertCircle
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

interface UserSubscription {
  hasRank: boolean;
  rank: {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
  } | null;
  expiresAt: string | null;
  isExpired: boolean;
  hasSubscription: boolean;
  subscriptionStatus: string | null;
  totalDonated: number;
}

interface DonatePageClientProps {
  ranks: DonationRank[];
  recentDonations: RecentDonation[];
  stats: DonationStats;
  userSubscription: UserSubscription | null;
}

interface PaymentConfig {
  provider: 'stripe' | 'kofi' | 'disabled';
  enabled: boolean;
  pageUrl?: string;
  mode?: 'test' | 'live';
  message?: string;
}

// Duration options for one-time purchases
const durationOptions = [
  { days: 30, label: '1 Month', discount: 0 },
  { days: 90, label: '3 Months', discount: 5 },
  { days: 180, label: '6 Months', discount: 10 },
  { days: 365, label: '12 Months', discount: 15 },
];

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

export function DonatePageClient({ ranks, recentDonations, stats, userSubscription }: DonatePageClientProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loadingRankId, setLoadingRankId] = useState<string | null>(null);
  const [loadingType, setLoadingType] = useState<'subscription' | 'one_time' | null>(null);
  const [loadingAmount, setLoadingAmount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Payment provider state
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [paymentConfigLoading, setPaymentConfigLoading] = useState(true);

  // One-time purchase modal state
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedRank, setSelectedRank] = useState<DonationRank | null>(null);
  const [selectedDuration, setSelectedDuration] = useState(30);

  const displayRanks = ranks.length > 0 ? ranks : defaultRanks;

  // Fetch payment config on mount
  useEffect(() => {
    const fetchPaymentConfig = async () => {
      try {
        const res = await fetch('/api/payments/config');
        if (res.ok) {
          const data = await res.json();
          setPaymentConfig(data);
        } else {
          setPaymentConfig({ provider: 'disabled', enabled: false });
        }
      } catch (err) {
        console.error('Failed to fetch payment config:', err);
        setPaymentConfig({ provider: 'disabled', enabled: false });
      } finally {
        setPaymentConfigLoading(false);
      }
    };
    fetchPaymentConfig();
  }, []);

  // Calculate price for a rank and duration
  const calculatePrice = (rank: DonationRank, days: number): number => {
    const pricePerDay = rank.minAmount / 30;
    const option = durationOptions.find(o => o.days === days);
    const discount = option?.discount || 0;
    const basePrice = pricePerDay * days;
    return Math.round(basePrice * (1 - discount / 100) * 100) / 100;
  };

  // Format remaining days
  const formatRemainingTime = (expiresAt: string): string => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'Expired';
    if (diffDays === 1) return '1 day left';
    if (diffDays < 30) return `${diffDays} days left`;
    const months = Math.floor(diffDays / 30);
    const remainingDays = diffDays % 30;
    if (remainingDays === 0) return `${months} month${months > 1 ? 's' : ''} left`;
    return `${months} month${months > 1 ? 's' : ''}, ${remainingDays} days left`;
  };

  const handleSubscribe = async (rank: DonationRank) => {
    if (status !== 'authenticated') {
      router.push('/login?callbackUrl=/donate');
      return;
    }

    setError(null);
    setLoadingRankId(rank.id);
    setLoadingType('subscription');

    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rankId: rank.id,
          days: 30,
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
      setLoadingType(null);
    }
  };

  const handleOneTimeRankPurchase = async () => {
    if (!selectedRank) return;

    if (status !== 'authenticated') {
      router.push('/login?callbackUrl=/donate');
      return;
    }

    setError(null);
    setLoadingRankId(selectedRank.id);
    setLoadingType('one_time');

    try {
      const amount = calculatePrice(selectedRank, selectedDuration);
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rankId: selectedRank.id,
          days: selectedDuration,
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
      setLoadingRankId(null);
      setLoadingType(null);
      setShowPurchaseModal(false);
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

  const openPurchaseModal = (rank: DonationRank) => {
    setSelectedRank(rank);
    setSelectedDuration(30);
    setShowPurchaseModal(true);
  };

  // Check if user already has this rank
  const userHasRank = (rankId: string): boolean => {
    return userSubscription?.rank?.id === rankId && !userSubscription?.isExpired;
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

      {/* Loading payment config */}
      {paymentConfigLoading && (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-neon-cyan" />
          <p className="text-muted-foreground mt-2">Loading payment options...</p>
        </div>
      )}

      {/* Donations Disabled */}
      {!paymentConfigLoading && paymentConfig?.provider === 'disabled' && (
        <Card variant="glass" className="max-w-2xl mx-auto mb-12">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold text-muted-foreground mb-2">
              Donations Currently Unavailable
            </h2>
            <p className="text-muted-foreground">
              We&apos;re not accepting donations at this time. Please check back later!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Ko-Fi Primary Donation Button */}
      {!paymentConfigLoading && paymentConfig?.provider === 'kofi' && paymentConfig.enabled && (
        <Card variant="gradient" className="max-w-2xl mx-auto mb-12">
          <CardContent className="p-8 text-center">
            <Coffee className="w-16 h-16 mx-auto mb-4 text-neon-pink" />
            <h2 className="text-2xl font-bold mb-4">Support Us on Ko-Fi</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Click the button below to make a donation through Ko-Fi. All donations are greatly appreciated!
            </p>
            <Button
              variant="gradient"
              size="lg"
              onClick={() => {
                if (paymentConfig.pageUrl) {
                  window.open(paymentConfig.pageUrl, '_blank');
                }
              }}
              className="bg-[#FF5E5B] hover:bg-[#FF5E5B]/90 border-none"
            >
              <Coffee className="w-5 h-5 mr-2" />
              Donate on Ko-Fi
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              <strong>Memberships</strong> automatically grant their rank. <strong>One-time donations</strong> are matched to the best rank (e.g. $5 = Supporter). Extra amount grants extra days!
            </p>
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
              <p className="text-xs text-yellow-500 flex items-center justify-center gap-1">
                <AlertCircle className="w-4 h-4 mr-1 shrink-0" />
                <span>
                  Important: Please ensure your Ko-Fi email matches your{' '}
                  <Link href="/settings" className="underline hover:text-yellow-400 font-medium">
                    account email
                  </Link>{' '}
                  for automatic rank assignment!
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Rank Status (if logged in and has rank) */}
      {userSubscription && userSubscription.hasRank && userSubscription.rank && !userSubscription.isExpired && (
        <Card variant="neon-glow" className="mb-8 max-w-2xl mx-auto">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                style={{
                  background: `${userSubscription.rank.color}20`,
                  border: `2px solid ${userSubscription.rank.color}50`,
                }}
              >
                {userSubscription.rank.icon || '👤'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-muted-foreground">Your Current Rank:</span>
                  <Badge
                    variant="outline"
                    style={{ borderColor: userSubscription.rank.color || '#00D9FF', color: userSubscription.rank.color || '#00D9FF' }}
                  >
                    {userSubscription.rank.name}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  {userSubscription.expiresAt && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {formatRemainingTime(userSubscription.expiresAt)}
                    </span>
                  )}
                  {userSubscription.hasSubscription && (
                    <span className="flex items-center gap-1 text-green-400">
                      <RefreshCw className="w-4 h-4" />
                      Auto-renewing
                    </span>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => router.push('/settings')}>
                Manage
              </Button>
            </div>
            {!userSubscription.hasSubscription && (
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Tip: Subscribe below to enable auto-renewal and never lose your rank!
              </p>
            )}
          </CardContent>
        </Card>
      )}

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
      {!paymentConfigLoading && (paymentConfig?.provider === 'stripe' || paymentConfig?.provider === 'kofi' && paymentConfig.enabled) && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-center mb-2">Donation Ranks</h2>
          <p className="text-center text-muted-foreground mb-8">
            {paymentConfig?.provider === 'kofi'
              ? 'Support us on Ko-Fi to automatically receive these ranks!'
              : 'Subscribe for auto-renewal or buy a one-time rank'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayRanks.map((rank) => {
              const isCurrentRank = userHasRank(rank.id);

              return (
                <Card
                  key={rank.id}
                  variant="glass"
                  hover
                  className={`relative overflow-hidden ${isCurrentRank ? 'ring-2 ring-green-500/50' : ''}`}
                  style={{ borderColor: `${rank.color}50` }}
                >
                  {/* Current rank badge */}
                  {isCurrentRank && (
                    <div className="absolute top-2 right-2 z-10">
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        <Check className="w-3 h-3 mr-1" /> Current
                      </Badge>
                    </div>
                  )}

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

                    {paymentConfig?.provider === 'stripe' ? (
                      <div className="space-y-2">
                        <Button
                          variant="neon-outline"
                          className="w-full"
                          style={{ borderColor: rank.color, color: rank.color }}
                          onClick={() => handleSubscribe(rank)}
                          disabled={loadingRankId === rank.id}
                        >
                          {loadingRankId === rank.id && loadingType === 'subscription' ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                          )}
                          {isCurrentRank ? 'Renew Subscription' : 'Subscribe'}
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full text-muted-foreground hover:text-foreground"
                          onClick={() => openPurchaseModal(rank)}
                          disabled={loadingRankId === rank.id}
                        >
                          <Clock className="w-4 h-4 mr-2" />
                          {isCurrentRank ? 'Extend Time' : 'Buy One-Time'}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Button
                          variant="neon-outline"
                          className="w-full"
                          style={{ borderColor: rank.color, color: rank.color }}
                          onClick={() => {
                            if (paymentConfig?.pageUrl) {
                              window.open(paymentConfig.pageUrl, '_blank');
                            }
                          }}
                        >
                          <Coffee className="w-4 h-4 mr-2" />
                          Donate {formatCurrency(rank.minAmount)}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* One-time Donation - Stripe Only */}
      {!paymentConfigLoading && paymentConfig?.provider === 'stripe' && (
        <Card variant="gradient" className="mb-12">
          <CardContent className="py-8 text-center">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-neon-cyan" />
            <h2 className="text-2xl font-bold mb-4">One-Time Tip</h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Want to support without a rank? Every donation helps keep our servers running!
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
      )}

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
            <span className="text-sm">{paymentConfig?.provider === 'stripe' ? 'Instant Activation' : 'Quick Processing'}</span>
          </div>
          {paymentConfig?.provider === 'stripe' && (
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-neon-cyan" />
              <span className="text-sm">Powered by Stripe</span>
            </div>
          )}
          {paymentConfig?.provider === 'kofi' && (
            <div className="flex items-center gap-2">
              <Coffee className="w-5 h-5 text-neon-pink" />
              <span className="text-sm">Powered by Ko-Fi</span>
            </div>
          )}
        </div>
      </div>

      {/* One-Time Purchase Modal */}
      {showPurchaseModal && selectedRank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card variant="glass" className="w-full max-w-md relative">
            <button
              onClick={() => setShowPurchaseModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <CardHeader className="text-center">
              <div
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl"
                style={{
                  background: `${selectedRank.color}20`,
                  border: `2px solid ${selectedRank.color}50`,
                }}
              >
                {selectedRank.icon}
              </div>
              <CardTitle style={{ color: selectedRank.color }}>
                {userHasRank(selectedRank.id) ? `Extend ${selectedRank.name}` : `Buy ${selectedRank.name}`}
              </CardTitle>
              <CardDescription>
                Choose how long you want your rank
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-6">
                {durationOptions.map((option) => {
                  const price = calculatePrice(selectedRank, option.days);
                  return (
                    <button
                      key={option.days}
                      onClick={() => setSelectedDuration(option.days)}
                      className={`w-full p-4 rounded-lg border-2 transition-all flex items-center justify-between ${selectedDuration === option.days
                        ? 'border-neon-cyan bg-neon-cyan/10'
                        : 'border-border hover:border-neon-cyan/50'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium">{option.label}</span>
                        {option.discount > 0 && (
                          <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-0">
                            Save {option.discount}%
                          </Badge>
                        )}
                      </div>
                      <span className="font-bold text-lg">{formatCurrency(price)}</span>
                    </button>
                  );
                })}
              </div>

              {userHasRank(selectedRank.id) && userSubscription?.expiresAt && (
                <p className="text-sm text-muted-foreground text-center mb-4">
                  This will add time to your current rank expiration.
                </p>
              )}

              <Button
                variant="gradient"
                className="w-full"
                onClick={handleOneTimeRankPurchase}
                disabled={loadingRankId === selectedRank.id}
              >
                {loadingRankId === selectedRank.id && loadingType === 'one_time' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4 mr-2" />
                )}
                Pay {formatCurrency(calculatePrice(selectedRank, selectedDuration))}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

