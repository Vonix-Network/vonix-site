'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { usePresenceHeartbeat } from '@/hooks/use-presence';
import { UnifiedChat } from '@/components/unified-chat';
import { SocketProvider } from '@/lib/socket-context';

function PresenceProvider({ children }: { children: React.ReactNode }) {
  usePresenceHeartbeat();
  return <>{children}</>;
}

// Separate component to access pathname inside providers
function FloatingChats() {
  return <UnifiedChat />;
}

export function Providers({ children }: { children: React.ReactNode }) {
  // Create QueryClient instance per component to avoid sharing state between requests
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <QueryClientProvider client={queryClient}>
          <SocketProvider>
            <PresenceProvider>
              {children}
              <FloatingChats />
            </PresenceProvider>
          </SocketProvider>
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              style: {
                background: 'rgba(10, 10, 15, 0.95)',
                border: '1px solid rgba(0, 217, 255, 0.2)',
                backdropFilter: 'blur(12px)',
              },
            }}
          />
        </QueryClientProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
