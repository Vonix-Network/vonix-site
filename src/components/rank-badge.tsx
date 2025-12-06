import { Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { type DonationRank } from '@/db/schema';

interface RankBadgeProps {
  rank: Partial<DonationRank> & { name: string; color: string | null };
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

/**
 * RankBadge Component
 * Displays donation rank badges similar to Hypixel's rank system
 * with custom colors
 */
export function RankBadge({ rank, size = 'md', showIcon = true, className }: RankBadgeProps) {
  if (!rank) return null;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const color = rank.color || '#00D9FF'; // Default color

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md font-bold transition-all',
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: `${color}20`,
        borderColor: `${color}50`,
        borderWidth: '1px',
        color: color,
        boxShadow: `0 0 10px ${color}20`,
      }}
    >
      {showIcon && <Crown className={iconSizes[size]} />}
      <span>{rank.name}</span>
    </div>
  );
}

interface RoleBadgeProps {
  role: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * RoleBadge Component
 * Displays staff role badges (admin, moderator, etc.)
 */
export function RoleBadge({ role, size = 'md', className }: RoleBadgeProps) {
  const badges = {
    superadmin: {
      variant: 'gradient' as const,
      label: 'Owner',
      icon: Crown,
    },
    admin: {
      variant: 'neon-pink' as const,
      label: 'Admin',
      icon: Crown,
    },
    moderator: {
      variant: 'neon-purple' as const,
      label: 'Mod',
      icon: Crown,
    },
  };

  const config = badges[role as keyof typeof badges];
  if (!config) return null;

  const Icon = config.icon;
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <Badge variant={config.variant} className={className}>
      <Icon className={cn(iconSizes[size], 'mr-1')} />
      {config.label}
    </Badge>
  );
}

interface UserBadgesProps {
  role: string;
  donationRank?: DonationRank | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * UserBadges Component
 * Displays all badges for a user (role + donation rank)
 */
export function UserBadges({ role, donationRank, className, size = 'md' }: UserBadgesProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <RoleBadge role={role} size={size} />
      {donationRank && <RankBadge rank={donationRank} size={size} />}
    </div>
  );
}
