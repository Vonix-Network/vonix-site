import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground shadow-neon-sm',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground',
        outline: 
          'text-foreground border-border',
        // Neon variants
        neon:
          'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan shadow-neon-sm',
        'neon-cyan':
          'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan',
        'neon-purple':
          'border-neon-purple/50 bg-neon-purple/10 text-neon-purple',
        'neon-pink':
          'border-neon-pink/50 bg-neon-pink/10 text-neon-pink',
        'neon-orange':
          'border-neon-orange/50 bg-neon-orange/10 text-neon-orange',
        gradient:
          'border-transparent bg-neon-rainbow text-white shadow-neon-rainbow',
        glass:
          'glass border-white/10 text-foreground',
        success:
          'border-success/50 bg-success/10 text-success',
        warning:
          'border-warning/50 bg-warning/10 text-warning',
        error:
          'border-error/50 bg-error/10 text-error',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

