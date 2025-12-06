import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://vonix.network'),
  title: {
    default: 'Vonix Network - Minecraft Community',
    template: '%s | Vonix Network',
  },
  description: 'A comprehensive Minecraft community platform with forums, social features, donations, and more. Join thousands of players in an amazing community.',
  keywords: ['minecraft', 'community', 'gaming', 'forum', 'social', 'server'],
  authors: [{ name: 'Vonix Network', url: 'https://vonix.network' }],
  creator: 'Vonix Network',
  publisher: 'Vonix Network',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://vonix.network',
    siteName: 'Vonix Network',
    title: 'Vonix Network - Minecraft Community',
    description: 'Join the ultimate Minecraft community with custom features, events, and endless possibilities.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Vonix Network',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vonix Network - Minecraft Community',
    description: 'Join the ultimate Minecraft community with custom features, events, and endless possibilities.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0f' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        {/* Preconnect to external resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS prefetch for performance */}
        <link rel="dns-prefetch" href="https://crafatar.com" />
        <link rel="dns-prefetch" href="https://mc-heads.net" />
      </head>
      <body className={`${inter.className} min-h-screen bg-background font-sans antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

