'use client';

import { useSession } from 'next-auth/react';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMessenger } from './messenger-context';

export function MessengerBar() {
  const { data: session } = useSession();
  const { showContactList, setShowContactList, totalUnread } = useMessenger();

  if (!session?.user) return null;

  return (
    <button
      onClick={() => setShowContactList(!showContactList)}
      className={cn(
        'fixed bottom-0 right-4 z-40 flex items-center gap-2 px-4 py-2.5 rounded-t-xl',
        'glass-card border border-white/10 border-b-0',
        'hover:bg-white/10 transition-all duration-200',
        'shadow-[0_-4px_20px_rgba(0,217,255,0.15)]',
        showContactList && 'bg-neon-cyan/10'
      )}
    >
      <MessageSquare className={cn('w-5 h-5', showContactList ? 'text-neon-cyan' : 'text-muted-foreground')} />
      <span className={cn('font-medium text-sm', showContactList ? 'text-neon-cyan' : 'text-foreground')}>
        Messenger
      </span>
      {totalUnread > 0 && (
        <span className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-error rounded-full animate-pulse">
          {totalUnread > 9 ? '9+' : totalUnread}
        </span>
      )}
    </button>
  );
}

