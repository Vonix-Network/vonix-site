'use client';

import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/5 via-neon-purple/5 to-neon-pink/5" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-cyan/10 rounded-full blur-[128px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-purple/10 rounded-full blur-[128px]" />

      <div className="text-center relative z-10">
        {/* 404 Text */}
        <h1 className="text-[150px] md:text-[200px] font-bold leading-none gradient-text mb-4">
          404
        </h1>
        
        <h2 className="text-2xl md:text-3xl font-bold mb-4">
          Page Not Found
        </h2>
        
        <p className="text-muted-foreground max-w-md mx-auto mb-8">
          Oops! The page you&apos;re looking for seems to have wandered off into the void. 
          Let&apos;s get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/">
            <Button variant="gradient" size="lg">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </Link>
          <Button variant="neon-outline" size="lg" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>

        {/* Decorative elements */}
        <div className="mt-16 flex justify-center gap-4">
          {[...Array(5)].map((_: any, i: any) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

