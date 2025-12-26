import Link from 'next/link';
import {
  Users,
  Crown,
  MessageSquare,
  Trophy,
  Sparkles,
  Zap,
  Shield,
  ArrowRight,
  Check,
  Server,
  Heart,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/layout/navbar';
import { ServerStatusList } from '@/components/server-status';
import { db } from '@/db';
import { users, donations, servers } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { HomeStats } from '@/components/home-stats';
import { Footer } from '@/components/layout/footer';

// Prevent Next.js from caching this page - stats should always be fresh
export const dynamic = 'force-dynamic';

async function getHomeStats() {
  try {
    const [userCount, donationStats, serverCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(users),
      db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` }).from(donations),
      db.select({ count: sql<number>`count(*)` }).from(servers),
    ]);

    return {
      users: userCount[0]?.count || 0,
      donations: donationStats[0]?.total || 0,
      servers: serverCount[0]?.count || 0,
    };
  } catch {
    return { users: 0, donations: 0, servers: 0 };
  }
}

const features = [
  {
    icon: Users,
    title: 'Vibrant Community',
    description: 'Join thousands of players in our active Minecraft community',
    color: 'text-neon-cyan',
    bgColor: 'bg-neon-cyan/10',
  },
  {
    icon: Crown,
    title: 'Donor Ranks',
    description: 'Exclusive perks and ranks for our amazing supporters',
    color: 'text-neon-orange',
    bgColor: 'bg-neon-orange/10',
  },
  {
    icon: MessageSquare,
    title: 'Discord Integration',
    description: 'Seamless chat bridging between in-game and Discord',
    color: 'text-neon-purple',
    bgColor: 'bg-neon-purple/10',
  },
  {
    icon: Trophy,
    title: 'Leaderboards',
    description: 'Compete with other players and climb the ranks',
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  {
    icon: Sparkles,
    title: 'Events & Activities',
    description: 'Regular community events and special activities',
    color: 'text-neon-pink',
    bgColor: 'bg-neon-pink/10',
  },
  {
    icon: Shield,
    title: 'Advanced Moderation',
    description: 'Safe and welcoming environment for all players',
    color: 'text-neon-cyan',
    bgColor: 'bg-neon-cyan/10',
  },
];

const perks = [
  'Advanced XP & Leveling System',
  'Custom Donation Ranks',
  'Forum & Social Features',
  'Group & Guild System',
  'Achievement System',
  'Real-time Chat Bridge',
];

export default async function HomePage() {
  const stats = await getHomeStats();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section - ORIGINAL CENTERED with VISIBLE GRADIENTS */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* ========== VISIBLE GRADIENT EFFECTS - DartNode Style ========== */}

        {/* Strong radial gradient overlay - cyan from left */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 80% 70% at 0% 40%, rgba(0, 217, 255, 0.18) 0%, transparent 55%),
              radial-gradient(ellipse 70% 60% at 100% 30%, rgba(139, 92, 246, 0.12) 0%, transparent 50%),
              radial-gradient(ellipse 60% 50% at 60% 90%, rgba(236, 72, 153, 0.08) 0%, transparent 45%)
            `
          }}
        />

        {/* Large cyan glow orb - left side like DartNode */}
        <div className="absolute top-1/4 -left-32 w-[800px] h-[800px] bg-neon-cyan/20 rounded-full blur-[160px] pointer-events-none" />

        {/* Purple glow orb - right side */}
        <div className="absolute bottom-1/3 -right-32 w-[600px] h-[600px] bg-neon-purple/15 rounded-full blur-[140px] pointer-events-none" />

        {/* Pink glow orb - bottom center */}
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-neon-pink/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Very subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        {/* ========== ORIGINAL CENTERED CONTENT ========== */}
        <div className="container relative z-10 px-4 py-20 text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full neon-border bg-background/50 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-neon-cyan" />
            <span className="text-sm font-medium gradient-text">Welcome to Vonix Network</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-tight">
            The Ultimate
            <br />
            <span className="gradient-text-animated">Minecraft Community</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Join thousands of players in an amazing community with custom features,
            events, and endless possibilities
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button size="xl" variant="gradient" asChild>
              <Link href="/register">
                Get Started
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>

            <Button size="xl" variant="neon-outline" asChild>
              <Link href="/servers">
                View Servers
              </Link>
            </Button>

            <Button size="xl" variant="glass" asChild>
              <a href="https://discord.gg/TXmVwQB5p7" target="_blank" rel="noopener noreferrer">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                Join Discord
              </a>
            </Button>
          </div>

          {/* Stats - Now Real-time */}
          <HomeStats initialData={stats} />
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-neon-cyan/50 flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-neon-cyan rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-32 px-4 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-7xl opacity-30 pointer-events-none">
          <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-neon-purple/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-neon-cyan/20 rounded-full blur-[120px]" />
        </div>

        <div className="container relative z-10">
          <div className="text-center mb-20 space-y-4">
            <Badge variant="neon" className="mb-4">Why Vonix?</Badge>
            <h2 className="text-4xl md:text-5xl font-bold">
              The Ultimate <span className="gradient-text">Minecraft Experience</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We've crafted every detail to provide the most immersive and engaging gameplay possible.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature: any, index: any) => (
              <div
                key={index}
                className="group relative p-1 rounded-2xl bg-gradient-to-b from-white/10 to-transparent hover:from-neon-cyan/50 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/5 via-transparent to-neon-purple/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
                <div className="relative h-full p-8 rounded-xl bg-card/50 backdrop-blur-xl border border-white/5 group-hover:border-transparent transition-all">
                  <div className={`mb-6 p-4 rounded-2xl w-fit ${feature.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className={`h-8 w-8 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-foreground group-hover:text-white transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed group-hover:text-gray-300 transition-colors">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Perks Section */}
      <section className="relative py-32 px-4 border-y border-white/5 bg-black/20">
        <div className="container relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Side - Content */}
            <div className="space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-purple/10 border border-neon-purple/20 text-neon-purple text-sm font-medium">
                <Zap className="h-4 w-4" />
                <span>Premium Features</span>
              </div>

              <h2 className="text-4xl md:text-6xl font-bold leading-tight">
                Everything You Need,
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple via-pink-500 to-neon-orange">
                  All in One Place
                </span>
              </h2>

              <p className="text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0">
                Vonix Network combines advanced custom plugins with a vanilla-friendly feel.
                Whether you're a builder, fighter, or explorer, we have something for you.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 pt-4">
                {perks.map((perk: any, index: any) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center shadow-lg shadow-neon-cyan/20">
                      <Check className="h-4 w-4 text-white font-bold" />
                    </div>
                    <span className="font-medium text-gray-200">{perk}</span>
                  </div>
                ))}
              </div>

              <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button size="xl" variant="neon" asChild className="shadow-lg shadow-neon-cyan/25">
                  <Link href="/register">
                    Join The Action
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button size="xl" variant="ghost" asChild className="border border-white/10 hover:bg-white/5">
                  <Link href="/about">
                    Learn More
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right Side - Live Server Status */}
            <div className="relative lg:h-[600px] flex items-center justify-centerPerspective">
              {/* Glowing backdrop */}
              <div className="absolute inset-0 bg-gradient-to-tr from-neon-purple/20 via-transparent to-neon-cyan/20 blur-3xl rounded-full" />

              <div className="relative w-full transform transition-transform hover:scale-[1.02] duration-500">
                <div className="absolute -inset-1 bg-gradient-to-r from-neon-cyan via-purple-500 to-neon-pink rounded-3xl opacity-30 blur-lg" />
                <div className="relative bg-[#0a0a0f]/90 backdrop-blur-xl rounded-2xl border border-white/10 p-2 shadow-2xl">
                  {/* Fake browser bar for style */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 mb-2">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500/50" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                      <div className="w-3 h-3 rounded-full bg-green-500/50" />
                    </div>
                    <div className="mx-auto text-xs text-muted-foreground font-mono">server-status.exe</div>
                  </div>
                  <ServerStatusList variant="carousel" showRefresh={true} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 px-4">
        <div className="container">
          <div className="relative rounded-3xl overflow-hidden border border-white/10">
            {/* Animated Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/80 via-purple-900/80 to-pink-900/80" />
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />

            {/* Glow Orbs */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-neon-cyan/30 rounded-full blur-[120px] mix-blend-screen" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-neon-purple/30 rounded-full blur-[120px] mix-blend-screen" />

            <div className="relative z-10 p-12 md:p-24 text-center space-y-10">
              <h2 className="text-5xl md:text-7xl font-bold tracking-tight text-white drop-shadow-2xl">
                Ready to Start?
              </h2>

              <p className="text-xl md:text-2xl text-gray-200 max-w-3xl mx-auto drop-shadow-md">
                Join thousands of other players today and verify your account to unlock exclusive rewards.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Button size="xl" className="bg-white text-black hover:bg-gray-100 min-w-[200px] text-lg h-14 shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all hover:scale-105" asChild>
                  <Link href="/register">
                    Create Account
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Link>
                </Button>

                <Button size="xl" variant="outline" className="border-2 border-white/20 text-white hover:bg-white/10 min-w-[200px] text-lg h-14 backdrop-blur-md" asChild>
                  <a href="https://discord.gg/TXmVwQB5p7" target="_blank" rel="noopener noreferrer">
                    Join Discord
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
