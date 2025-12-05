'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { usePresenceHeartbeat } from '@/hooks/use-presence';
import { Messenger } from '@/components/messenger';

function PresenceProvider({ children }: { children: React.ReactNode }) {
  usePresenceHeartbeat();
  return <>{children}</>;
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
          <PresenceProvider>
            {children}
            <Messenger />
          </PresenceProvider>
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
