'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
    Server,
    Shield,
    Headphones,
    Rocket,
    Clock,
    Settings,
    ArrowRight,
    ExternalLink,
    Zap,
    CheckCircle,
    Sparkles,
    Globe,
    Cpu,
    HardDrive,
    Heart,
    MapPin,
    Package,
    Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/layout/navbar';

const AFFILIATE_URL = 'https://ultraservers.com/aff.php?code=kJj5hk5koEMNj5Il';
const ULTRASERVERS_LOGO = 'https://ultraservers.com/templates/ultra/img/ultraservers-icon.svg';

// Real UltraServers plans - $1/GB pricing
const plans = [
    { ram: '4GB', vcores: 2, storage: '60GB', price: 4, popular: false },
    { ram: '6GB', vcores: 3, storage: '90GB', price: 6, popular: false },
    { ram: '8GB', vcores: 4, storage: '120GB', price: 8, popular: true },
    { ram: '12GB', vcores: 5, storage: '180GB', price: 12, popular: false },
    { ram: '16GB', vcores: 6, storage: '240GB', price: 16, popular: false },
    { ram: '32GB', vcores: 8, storage: '480GB', price: 32, popular: false },
];

const features = [
    {
        icon: Cpu,
        title: 'AMD Ryzen 9950X / 7950X3D',
        description: 'Industry-leading gaming CPUs with massive L3 cache for optimal Minecraft performance.',
        color: 'text-neon-cyan',
        bgColor: 'bg-neon-cyan/10',
    },
    {
        icon: Shield,
        title: 'Advanced DDoS Protection',
        description: 'Enterprise-grade protection against flood attacks, TCP/UDP connection attacks, and application-layer attacks.',
        color: 'text-neon-purple',
        bgColor: 'bg-neon-purple/10',
    },
    {
        icon: Headphones,
        title: '24/7 Expert Support',
        description: 'Average response time under 30 minutes. Active Discord community with real-time help.',
        color: 'text-neon-pink',
        bgColor: 'bg-neon-pink/10',
    },
    {
        icon: HardDrive,
        title: 'NVMe SSD Storage',
        description: 'Ultra-fast NVMe drives for instant world loading and zero lag during intensive operations.',
        color: 'text-success',
        bgColor: 'bg-success/10',
    },
    {
        icon: Zap,
        title: 'Instant Setup',
        description: 'Your server is deployed within minutes. 7-day money-back guarantee if you\'re not satisfied.',
        color: 'text-neon-orange',
        bgColor: 'bg-neon-orange/10',
    },
    {
        icon: Settings,
        title: 'Pterodactyl Control Panel',
        description: 'Professional game panel with file manager, subusers, schedules, backups, and one-click modpack installs.',
        color: 'text-neon-cyan',
        bgColor: 'bg-neon-cyan/10',
    },
];

const benefits = [
    '15,000+ one-click modpack installs',
    'Paper, Forge, Fabric, NeoForge, Purpur, Spigot supported',
    'Automatic hourly off-site backups',
    'Full FTP access & 10 MySQL databases',
    '2 free subdomains included',
    'Free server migration from other hosts',
    'Geyser support for Bedrock players',
    'Proxy servers (Velocity, BungeeCord)',
];

const locations = [
    { name: 'Ashburn, VA', region: 'North America East' },
    { name: 'Los Angeles, CA', region: 'North America West' },
    { name: 'Amsterdam', region: 'Europe' },
    { name: 'Singapore', region: 'Asia' },
    { name: 'Sydney', region: 'Australia' },
];

export default function HostingPage() {
    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            {/* Hero Section */}
            <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden pt-16">
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
                    {/* Support Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/30">
                        <Heart className="h-4 w-4 text-success" />
                        <span className="text-sm font-medium text-success">25% of your purchase supports Vonix Network</span>
                    </div>

                    {/* Main Headline */}
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-tight">
                        <span className="gradient-text-animated">$1/GB</span>
                        <br />
                        Minecraft Hosting
                    </h1>

                    {/* Subheadline */}
                    <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                        Powered by <a href={AFFILIATE_URL} target="_blank" rel="noopener noreferrer" className="text-neon-cyan hover:text-neon-cyan/80 transition-colors font-semibold hover:underline">UltraServers.com</a> — AMD Ryzen 9950X & 7950X3D processors, NVMe storage, and 24/7 support.
                    </p>

                    {/* UltraServers Logo */}
                    <div className="flex justify-center py-6">
                        <div className="p-6 rounded-2xl glass-card neon-border">
                            <Image
                                src={ULTRASERVERS_LOGO}
                                alt="UltraServers Logo"
                                width={180}
                                height={60}
                                className="h-16 w-auto brightness-0 invert"
                                unoptimized
                            />
                        </div>
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <Button size="xl" variant="gradient" asChild>
                            <a href={AFFILIATE_URL} target="_blank" rel="noopener noreferrer">
                                Get Started from $4/mo
                                <ExternalLink className="h-5 w-5" />
                            </a>
                        </Button>

                        <Button size="xl" variant="neon-outline" asChild>
                            <a href="#pricing">
                                View All Plans
                            </a>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="relative py-24 px-4">
                <div className="container">
                    {/* Section Header */}
                    <div className="text-center mb-16 space-y-4">
                        <Badge variant="neon" className="mb-4">
                            <Package className="h-3 w-3 mr-1" />
                            Simple Pricing
                        </Badge>
                        <h2 className="text-4xl md:text-5xl font-bold">
                            Just <span className="gradient-text">$1 per GB</span> of RAM
                        </h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            CPU, storage, and RAM all scale together. No hidden fees, no add-ons needed.
                        </p>
                    </div>

                    {/* Pricing Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {plans.map((plan, index) => (
                            <Card
                                key={index}
                                variant={plan.popular ? 'neon-glow' : 'glass'}
                                hover
                                className="relative"
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <Badge variant="gradient">Most Popular</Badge>
                                    </div>
                                )}
                                <CardContent className="p-6 space-y-6">
                                    <div className="text-center">
                                        <div className="text-4xl font-bold gradient-text">{plan.ram}</div>
                                        <div className="text-muted-foreground">RAM</div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Cpu className="h-4 w-4 text-neon-cyan" />
                                            <span>{plan.vcores} vCores – Ryzen 9950X/7950X3D</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <HardDrive className="h-4 w-4 text-neon-purple" />
                                            <span>{plan.storage} NVMe Storage</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Shield className="h-4 w-4 text-success" />
                                            <span>DDoS Protection Included</span>
                                        </div>
                                    </div>

                                    <div className="text-center pt-4 border-t border-white/10">
                                        <div className="text-3xl font-bold">
                                            ${plan.price}<span className="text-sm text-muted-foreground">/mo</span>
                                        </div>
                                    </div>

                                    <Button
                                        variant={plan.popular ? 'gradient' : 'neon-outline'}
                                        className="w-full"
                                        asChild
                                    >
                                        <a href={AFFILIATE_URL} target="_blank" rel="noopener noreferrer">
                                            Select Plan
                                            <ExternalLink className="h-4 w-4 ml-2" />
                                        </a>
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Larger Plans Note */}
                    <div className="text-center mt-8">
                        <p className="text-muted-foreground">
                            Need more power? Plans available up to <span className="text-neon-cyan font-semibold">64GB RAM</span> with 8 vCores and 960GB NVMe.{' '}
                            <a href={AFFILIATE_URL} target="_blank" rel="noopener noreferrer" className="text-neon-purple hover:underline">
                                View all plans →
                            </a>
                        </p>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="relative py-24 px-4 bg-gradient-to-b from-background to-background/50">
                <div className="container">
                    {/* Section Header */}
                    <div className="text-center mb-16 space-y-4">
                        <Badge variant="neon" className="mb-4">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Premium Features
                        </Badge>
                        <h2 className="text-4xl md:text-5xl font-bold">
                            Enterprise-Grade <span className="gradient-text">Hardware</span>
                        </h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            UltraServers uses the latest AMD Ryzen processors optimized for Minecraft
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

            {/* Global Locations Section */}
            <section className="relative py-24 px-4">
                <div className="container">
                    <div className="text-center mb-12 space-y-4">
                        <Badge variant="neon-purple" className="mb-4">
                            <Globe className="h-3 w-3 mr-1" />
                            Global Network
                        </Badge>
                        <h2 className="text-4xl md:text-5xl font-bold">
                            <span className="gradient-text">5 Server Locations</span> Worldwide
                        </h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Choose the location closest to your players for the lowest latency
                        </p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-4">
                        {locations.map((location, index) => (
                            <Card key={index} variant="glass" className="p-4">
                                <div className="flex items-center gap-3">
                                    <MapPin className="h-5 w-5 text-neon-cyan" />
                                    <div>
                                        <div className="font-semibold">{location.name}</div>
                                        <div className="text-sm text-muted-foreground">{location.region}</div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="relative py-24 px-4">
                <div className="container">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* Left Side - Content */}
                        <div className="space-y-6">
                            <Badge variant="neon-purple" className="mb-4">
                                <Database className="h-3 w-3 mr-1" />
                                Everything Included
                            </Badge>

                            <h2 className="text-4xl md:text-5xl font-bold">
                                All Server Types
                                <br />
                                <span className="gradient-text">15,000+ Modpacks</span>
                            </h2>

                            <p className="text-lg text-muted-foreground">
                                Whether you're running vanilla, Forge, Fabric, Paper, or any modpack from CurseForge,
                                Modrinth, ATLauncher, or Feed The Beast — UltraServers has you covered with one-click installation.
                            </p>

                            <div className="space-y-3 pt-4">
                                {benefits.map((benefit, index) => (
                                    <div key={index} className="flex items-center gap-3 group">
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-success/10 flex items-center justify-center group-hover:bg-success/20 transition-colors">
                                            <CheckCircle className="h-4 w-4 text-success" />
                                        </div>
                                        <span className="text-muted-foreground group-hover:text-foreground transition-colors">{benefit}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-6">
                                <Button size="lg" variant="neon" asChild>
                                    <a href={AFFILIATE_URL} target="_blank" rel="noopener noreferrer">
                                        Start Your Server Today
                                        <ArrowRight className="h-5 w-5" />
                                    </a>
                                </Button>
                            </div>
                        </div>

                        {/* Right Side - Stats Card */}
                        <div className="relative">
                            <Card variant="neon-glow" className="p-8">
                                <div className="space-y-6 text-center">
                                    <div className="w-24 h-24 mx-auto rounded-2xl bg-neon-rainbow flex items-center justify-center">
                                        <Heart className="w-12 h-12 text-white" />
                                    </div>

                                    <div>
                                        <h3 className="text-2xl font-bold mb-2">Support Vonix Network</h3>
                                        <p className="text-muted-foreground">
                                            When you sign up through our link, <span className="text-success font-semibold">25% of your purchase supports Vonix Network</span> at no extra cost to you!
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 pt-4">
                                        <div className="p-4 rounded-xl bg-white/5">
                                            <div className="text-2xl font-bold text-neon-cyan">$1</div>
                                            <div className="text-xs text-muted-foreground">per GB</div>
                                        </div>
                                        <div className="p-4 rounded-xl bg-white/5">
                                            <div className="text-2xl font-bold text-neon-purple">15K+</div>
                                            <div className="text-xs text-muted-foreground">Modpacks</div>
                                        </div>
                                        <div className="p-4 rounded-xl bg-white/5">
                                            <div className="text-2xl font-bold text-success">7 Day</div>
                                            <div className="text-xs text-muted-foreground">Refund</div>
                                        </div>
                                    </div>

                                    <Button variant="gradient" className="w-full" size="lg" asChild>
                                        <a href={AFFILIATE_URL} target="_blank" rel="noopener noreferrer">
                                            Get Your Server Now
                                            <ExternalLink className="w-4 h-4 ml-2" />
                                        </a>
                                    </Button>
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
                            <div className="flex justify-center mb-4">
                                <Image
                                    src={ULTRASERVERS_LOGO}
                                    alt="UltraServers Logo"
                                    width={150}
                                    height={50}
                                    className="h-12 w-auto brightness-0 invert opacity-80"
                                    unoptimized
                                />
                            </div>

                            <h2 className="text-4xl md:text-5xl font-bold">
                                Ready to Start Your Server?
                            </h2>

                            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                                AMD Ryzen 9950X/7950X3D • NVMe Storage • 24/7 Support • 7-Day Money-Back Guarantee
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
                                <Button size="xl" variant="neon" asChild>
                                    <a href={AFFILIATE_URL} target="_blank" rel="noopener noreferrer">
                                        Get Started from $4/mo
                                        <ExternalLink className="h-5 w-5" />
                                    </a>
                                </Button>

                                <Button size="xl" variant="glass" asChild>
                                    <Link href="/servers">
                                        View Our Servers
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/10 py-8 px-4">
                <div className="container text-center space-y-2">
                    <p className="text-sm text-success font-medium">
                        <Heart className="h-4 w-4 inline mr-1" />
                        25% of purchases through our links support Vonix Network!
                    </p>
                    <p className="text-xs text-muted-foreground">
                        * Vonix Network is an affiliate partner of UltraServers.
                        All prices in USD. Features and specs sourced from ultraservers.com.
                    </p>
                </div>
            </footer>
        </div>
    );
}
