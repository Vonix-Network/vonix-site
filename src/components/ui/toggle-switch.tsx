'use client';

import { cn } from '@/lib/utils';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  className,
}: ToggleSwitchProps) {
  const sizes = {
    sm: {
      track: 'w-9 h-5',
      thumb: 'w-4 h-4',
      thumbMargin: 'top-0.5 left-0.5',
      translate: 'translate-x-4'
    },
    md: {
      track: 'w-12 h-6',
      thumb: 'w-5 h-5',
      thumbMargin: 'top-0.5 left-0.5',
      translate: 'translate-x-6'
    },
    lg: {
      track: 'w-14 h-7',
      thumb: 'w-6 h-6',
      thumbMargin: 'top-0.5 left-0.5',
      translate: 'translate-x-7'
    },
  };

  const { track, thumb, thumbMargin, translate } = sizes[size];

  return (
    <div className={cn('flex items-center justify-between', className)}>
      {(label || description) && (
        <div className="flex-1 mr-4">
          {label && <span className="font-medium text-foreground">{label}</span>}
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative inline-flex shrink-0 cursor-pointer rounded-full',
          'transition-all duration-200 ease-in-out',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          track,
          checked
            ? 'bg-neon-cyan shadow-[0_0_10px_rgba(0,255,255,0.3)]'
            : 'bg-secondary/70 border border-white/10',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute rounded-full bg-white shadow-md',
            'transform ring-0 transition-all duration-200 ease-in-out',
            thumb,
            thumbMargin,
            checked ? translate : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
}

// Wrapper for use in forms/cards with consistent styling
interface ToggleCardProps extends ToggleSwitchProps {
  variant?: 'default' | 'glass';
}

export function ToggleCard({
  variant = 'default',
  className,
  ...props
}: ToggleCardProps) {
  return (
    <div
      className={cn(
        'p-4 rounded-lg transition-colors',
        variant === 'glass' ? 'bg-secondary/30 border border-white/5' : 'bg-secondary/50',
        className
      )}
    >
      <ToggleSwitch {...props} />
    </div>
  );
}

