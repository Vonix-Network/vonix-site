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

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/5 via-neon-purple/5 to-neon-pink/5 animate-gradient-xy" />

        {/* Radial glow effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-cyan/20 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-purple/20 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neon-pink/10 rounded-full blur-[150px]" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />

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
      <section className="relative py-24 px-4">
        <div className="container">
          {/* Section Header */}
          <div className="text-center mb-16 space-y-4">
            <Badge variant="neon" className="mb-4">Features</Badge>
            <h2 className="text-4xl md:text-5xl font-bold">
              Why Choose <span className="gradient-text">Vonix Network</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience Minecraft like never before with our premium features and active community
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card
                key={index}
                variant="glass"
                hover
                className="group"
              >
                <CardContent className="p-6 space-y-4">
                  <div className={`p-3 rounded-xl ${feature.bgColor} w-fit group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className={`h-8 w-8 ${feature.color}`} />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Perks Section */}
      <section className="relative py-24 px-4">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Content */}
            <div className="space-y-6">
              <Badge variant="neon-purple" className="mb-4">
                <Zap className="h-3 w-3 mr-1" />
                Premium Features
              </Badge>

              <h2 className="text-4xl md:text-5xl font-bold">
                Everything You Need,
                <br />
                <span className="gradient-text">All in One Place</span>
              </h2>

              <p className="text-lg text-muted-foreground">
                Vonix Network offers a complete Minecraft community experience with
                advanced features designed for both casual and hardcore players.
              </p>

              <div className="space-y-3 pt-4">
                {perks.map((perk, index) => (
                  <div key={index} className="flex items-center gap-3 group">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-success/10 flex items-center justify-center group-hover:bg-success/20 transition-colors">
                      <Check className="h-4 w-4 text-success" />
                    </div>
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">{perk}</span>
                  </div>
                ))}
              </div>

              <div className="pt-6">
                <Button size="lg" variant="neon" asChild>
                  <Link href="/register">
                    Join Now
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right Side - Live Server Status */}
            <div className="relative">
              <Card variant="neon-glow" className="p-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-neon-rainbow flex items-center justify-center">
                      <Server className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Live Server Status</h3>
                      <p className="text-muted-foreground">Real-time updates</p>
                    </div>
                  </div>

                  {/* Live Server Status Component - Carousel style */}
                  <ServerStatusList variant="carousel" showRefresh={true} />

                  <div className="pt-2">
                    <Button variant="neon-outline" className="w-full" asChild>
                      <Link href="/servers">
                        View All Servers
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-neon-cyan/20 rounded-full blur-2xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-neon-purple/20 rounded-full blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-4">
        <div className="container">
          <Card variant="gradient" glow className="text-center overflow-hidden relative">
            {/* Background effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/20 via-neon-purple/20 to-neon-pink/20" />
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-neon-cyan/30 rounded-full blur-[100px]" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-neon-pink/30 rounded-full blur-[100px]" />

            <CardContent className="relative z-10 p-12 space-y-6">
              <h2 className="text-4xl md:text-5xl font-bold">
                Ready to Start Your Adventure?
              </h2>

              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Join our community today and experience Minecraft in a whole new way
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
                <Button size="xl" variant="neon" asChild>
                  <Link href="/register">
                    Create Account
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>

                <Button size="xl" variant="glass" asChild>
                  <Link href="/forum">
                    Browse Forum
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-4">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8">
                  <svg viewBox="0 0 100 100" fill="none">
                    <defs>
                      <linearGradient id="footerLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#00D9FF" />
                        <stop offset="50%" stopColor="#8B5CF6" />
                        <stop offset="100%" stopColor="#EC4899" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M20 25 L50 85 L80 25"
                      stroke="url(#footerLogoGradient)"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="text-lg font-bold gradient-text">Vonix Network</span>
              </div>
              <p className="text-sm text-muted-foreground">
                The ultimate Minecraft community platform with custom features and endless possibilities.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold mb-4">Community</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/forum" className="hover:text-neon-cyan transition-colors">Forum</Link></li>
                <li><Link href="/leaderboard" className="hover:text-neon-cyan transition-colors">Leaderboard</Link></li>
                <li><Link href="/events" className="hover:text-neon-cyan transition-colors">Events</Link></li>
                <li><Link href="/donations" className="hover:text-neon-cyan transition-colors">Donations</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/servers" className="hover:text-neon-cyan transition-colors">Servers</Link></li>
                <li><a href="https://ultraservers.com/aff.php?code=kJj5hk5koEMNj5Il" target="_blank" rel="noopener noreferrer" className="hover:text-neon-cyan transition-colors">Server Hosting</a></li>
                <li><Link href="/ranks" className="hover:text-neon-cyan transition-colors">Ranks</Link></li>
                <li><Link href="/blog" className="hover:text-neon-cyan transition-colors">Blog</Link></li>
                <li><Link href="/support" className="hover:text-neon-cyan transition-colors">Support</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-neon-cyan transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-neon-cyan transition-colors">Terms of Service</Link></li>
                <li><Link href="/rules" className="hover:text-neon-cyan transition-colors">Server Rules</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Vonix Network. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Badge variant="success">
                <div className="w-2 h-2 rounded-full bg-success mr-2 animate-pulse" />
                All Systems Operational
              </Badge>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

