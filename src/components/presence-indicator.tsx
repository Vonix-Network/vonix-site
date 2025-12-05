'use client';

import { cn } from '@/lib/utils';
import { isUserOnline, formatLastSeen } from '@/hooks/use-presence';

interface PresenceIndicatorProps {
  lastSeenAt?: Date | string | null;
  online?: boolean; // Can override with explicit online status
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

/**
 * Presence indicator dot showing online/offline status
 */
export function PresenceIndicator({
  lastSeenAt,
  online: explicitOnline,
  size = 'md',
  showLabel = false,
  className,
}: PresenceIndicatorProps) {
  const online = explicitOnline ?? isUserOnline(lastSeenAt);

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span
        className={cn(
          'rounded-full border-2 border-background flex-shrink-0',
          sizeClasses[size],
          online
            ? 'bg-success animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.6)]'
            : 'bg-muted-foreground'
        )}
      />
      {showLabel && (
        <span className={cn(
          'text-xs',
          online ? 'text-success' : 'text-muted-foreground'
        )}>
          {online ? 'Online' : formatLastSeen(lastSeenAt)}
        </span>
      )}
    </div>
  );
}

interface PresenceBadgeProps {
  lastSeenAt?: Date | string | null;
  online?: boolean;
  className?: string;
}

/**
 * Presence badge positioned absolutely (for use on avatars)
 */
export function PresenceBadge({
  lastSeenAt,
  online: explicitOnline,
  className,
}: PresenceBadgeProps) {
  const online = explicitOnline ?? isUserOnline(lastSeenAt);

  return (
    <span
      className={cn(
        'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background',
        online
          ? 'bg-success shadow-[0_0_6px_rgba(34,197,94,0.6)]'
          : 'bg-muted-foreground',
        className
      )}
    />
  );
}

