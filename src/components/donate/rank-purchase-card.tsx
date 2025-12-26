'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Check, CreditCard, Loader2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { getDurationPackages } from '@/lib/rank-pricing';

interface RankPurchaseCardProps {
  rank: {
    id: string;
    name: string;
    minAmount: number;
    color: string;
    textColor: string;
    icon: string | null;
    glow?: boolean;
    perks: string[];
  };
}

export function RankPurchaseCard({ rank }: RankPurchaseCardProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [paymentType, setPaymentType] = useState<'one_time' | 'subscription'>('one_time');
  const [isLoading, setIsLoading] = useState(false);

  const packages = getDurationPackages(rank.id);
  const selectedPackage = packages.find((p: any) => p.days === selectedDuration) || packages[0];

  const handlePurchase = async () => {
    if (!session) {
      router.push('/login?callbackUrl=/donate');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rankId: rank.id,
          days: selectedDuration,
          paymentType,
        }),
      });

      if (res.ok) {
        const { url } = await res.json();
        if (url) {
          window.location.href = url;
        }
      } else {
        const error = await res.json();
        console.error('Checkout error:', error);
        alert('Failed to start checkout. Please try again.');
      }
    } catch (err: any) {
      console.error('Purchase error:', err);
      alert('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card 
      variant="glass" 
      hover
      className="relative overflow-hidden"
      style={{ borderColor: `${rank.color}50` }}
    >
      {/* Glow effect */}
      {rank.glow && (
        <div 
          className="absolute inset-0 opacity-10"
          style={{ background: `radial-gradient(circle at top, ${rank.color}, transparent 70%)` }}
        />
      )}
      
      <CardHeader className="text-center relative">
        <div 
          className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl"
          style={{ 
            background: `${rank.color}20`,
            border: `2px solid ${rank.color}50`,
          }}
        >
          {rank.icon || '💎'}
        </div>
        <CardTitle style={{ color: rank.color }}>{rank.name}</CardTitle>
        <CardDescription>
          Starting at <span className="text-foreground font-bold">{formatCurrency(rank.minAmount)}</span>/month
        </CardDescription>
      </CardHeader>

      <CardContent className="relative space-y-4">
        {/* Payment Type Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Payment Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPaymentType('one_time')}
              className={`p-3 rounded-lg border text-center transition-all ${
                paymentType === 'one_time'
                  ? 'border-2 bg-opacity-20'
                  : 'border-border hover:border-opacity-50'
              }`}
              style={{
                borderColor: paymentType === 'one_time' ? rank.color : undefined,
                backgroundColor: paymentType === 'one_time' ? `${rank.color}10` : undefined,
              }}
            >
              <p className="font-medium text-sm">One-Time</p>
              <p className="text-xs text-muted-foreground">Single payment</p>
            </button>
            <button
              onClick={() => setPaymentType('subscription')}
              className={`p-3 rounded-lg border text-center transition-all ${
                paymentType === 'subscription'
                  ? 'border-2 bg-opacity-20'
                  : 'border-border hover:border-opacity-50'
              }`}
              style={{
                borderColor: paymentType === 'subscription' ? rank.color : undefined,
                backgroundColor: paymentType === 'subscription' ? `${rank.color}10` : undefined,
              }}
            >
              <p className="font-medium text-sm">Subscription</p>
              <p className="text-xs text-muted-foreground">Auto-renew</p>
            </button>
          </div>
        </div>

        {/* Duration Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Select Duration
          </label>
          <div className="grid grid-cols-2 gap-2">
            {packages.map((pkg: any) => (
              <button
                key={pkg.days}
                onClick={() => setSelectedDuration(pkg.days)}
                className={`p-3 rounded-lg border text-center transition-all ${
                  selectedDuration === pkg.days
                    ? 'border-2 bg-opacity-20'
                    : 'border-border hover:border-opacity-50'
                }`}
                style={{
                  borderColor: selectedDuration === pkg.days ? rank.color : undefined,
                  backgroundColor: selectedDuration === pkg.days ? `${rank.color}10` : undefined,
                }}
              >
                <p className="font-medium text-sm">{pkg.label}</p>
                <p className="text-lg font-bold">{formatCurrency(pkg.price)}</p>
                {pkg.discount && (
                  <Badge variant="success" className="text-xs mt-1">
                    Save {pkg.discount}%
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Perks */}
        <ul className="space-y-2">
          {rank.perks.slice(0, 4).map((perk: any, i: any) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: rank.color }} />
              <span className="text-muted-foreground">{perk}</span>
            </li>
          ))}
          {rank.perks.length > 4 && (
            <li className="text-xs text-muted-foreground pl-6">
              +{rank.perks.length - 4} more perks
            </li>
          )}
        </ul>

        {/* Purchase Button */}
        <Button 
          variant="neon-outline" 
          className="w-full"
          style={{ 
            borderColor: rank.color,
            color: rank.color,
          }}
          onClick={handlePurchase}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Purchase for {formatCurrency(selectedPackage.price)}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

