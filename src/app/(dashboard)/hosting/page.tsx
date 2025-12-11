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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/layout/navbar';

const AFFILIATE_URL = 'https://ultraservers.com/aff.php?code=kJj5hk5koEMNj5Il';
const ULTRASERVERS_LOGO = 'https://ultraservers.com/templates/ultra/img/ultraservers-icon.svg';

const features = [
    {
        icon: Clock,
        title: '99.9% Uptime Guarantee',
        description: 'Enterprise-grade infrastructure ensures your server stays online when you need it most.',
        color: 'text-neon-cyan',
        bgColor: 'bg-neon-cyan/10',
    },
    {
        icon: Shield,
        title: 'DDoS Protection',
        description: 'Advanced protection shields your server from attacks, keeping your players safe.',
        color: 'text-neon-purple',
        bgColor: 'bg-neon-purple/10',
    },
    {
        icon: Headphones,
        title: '24/7 Expert Support',
        description: 'Knowledgeable support team ready to help you anytime, day or night.',
        color: 'text-neon-pink',
        bgColor: 'bg-neon-pink/10',
    },
    {
        icon: Rocket,
        title: 'High Performance',
        description: 'Latest hardware with NVMe SSDs and high-frequency CPUs for lag-free gameplay.',
        color: 'text-success',
        bgColor: 'bg-success/10',
    },
    {
        icon: Zap,
        title: 'Instant Setup',
        description: 'Your server is ready within minutes. No waiting, just play.',
        color: 'text-neon-orange',
        bgColor: 'bg-neon-orange/10',
    },
    {
        icon: Settings,
        title: 'Full Control Panel',
        description: 'Easy-to-use control panel with one-click modpack installations and backups.',
        color: 'text-neon-cyan',
        bgColor: 'bg-neon-cyan/10',
    },
];

const benefits = [
    'Unlimited player slots available',
    'Free subdomain included',
    'Automatic backups',
    'One-click modpack installer',
    'Full FTP access',
    'MySQL database included',
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
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full neon-border bg-background/50 backdrop-blur-sm">
                        <Server className="h-4 w-4 text-neon-cyan" />
                        <span className="text-sm font-medium gradient-text">Recommended Hosting Partner</span>
                    </div>

                    {/* Main Headline */}
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-tight">
                        <span className="gradient-text-animated">Premium</span>
                        <br />
                        Server Hosting
                    </h1>

                    {/* Subheadline */}
                    <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                        Powered by <a href={AFFILIATE_URL} target="_blank" rel="noopener noreferrer" className="text-neon-cyan hover:text-neon-cyan/80 transition-colors font-semibold hover:underline">UltraServers.com</a> — The hosting provider
                        trusted by Vonix Network for reliable, high-performance Minecraft servers.
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
                                Get Started with UltraServers
                                <ExternalLink className="h-5 w-5" />
                            </a>
                        </Button>

                        <Button size="xl" variant="neon-outline" asChild>
                            <a href={AFFILIATE_URL} target="_blank" rel="noopener noreferrer">
                                View Plans
                            </a>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="relative py-24 px-4">
                <div className="container">
                    {/* Section Header */}
                    <div className="text-center mb-16 space-y-4">
                        <Badge variant="neon" className="mb-4">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Features
                        </Badge>
                        <h2 className="text-4xl md:text-5xl font-bold">
                            Why Choose <span className="gradient-text">UltraServers</span>
                        </h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Experience premium Minecraft hosting with enterprise-grade features
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

            {/* Benefits Section */}
            <section className="relative py-24 px-4">
                <div className="container">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* Left Side - Content */}
                        <div className="space-y-6">
                            <Badge variant="neon-purple" className="mb-4">
                                <Globe className="h-3 w-3 mr-1" />
                                Trusted Partner
                            </Badge>

                            <h2 className="text-4xl md:text-5xl font-bold">
                                Why Vonix Network
                                <br />
                                <span className="gradient-text">Recommends UltraServers</span>
                            </h2>

                            <p className="text-lg text-muted-foreground">
                                We've tested countless hosting providers, and UltraServers consistently delivers
                                the performance, reliability, and support that serious Minecraft communities demand.
                                That's why we trust them to host our servers and recommend them to our players.
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

                        {/* Right Side - Decorative Card */}
                        <div className="relative">
                            <Card variant="neon-glow" className="p-8">
                                <div className="space-y-6 text-center">
                                    <div className="w-24 h-24 mx-auto rounded-2xl bg-neon-rainbow flex items-center justify-center">
                                        <Server className="w-12 h-12 text-white" />
                                    </div>

                                    <div>
                                        <h3 className="text-2xl font-bold mb-2">Ready to Get Started?</h3>
                                        <p className="text-muted-foreground">
                                            Join thousands of server owners who trust UltraServers for their Minecraft hosting needs.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-4">
                                        <div className="p-4 rounded-xl bg-white/5">
                                            <div className="text-3xl font-bold text-neon-cyan">99.9%</div>
                                            <div className="text-sm text-muted-foreground">Uptime</div>
                                        </div>
                                        <div className="p-4 rounded-xl bg-white/5">
                                            <div className="text-3xl font-bold text-neon-purple">24/7</div>
                                            <div className="text-sm text-muted-foreground">Support</div>
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
                                Start Your Minecraft Server Today
                            </h2>

                            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                                Join the Vonix Network community in using UltraServers for reliable,
                                high-performance Minecraft hosting
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
                                <Button size="xl" variant="neon" asChild>
                                    <a href={AFFILIATE_URL} target="_blank" rel="noopener noreferrer">
                                        Get Started Now
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
                <div className="container text-center">
                    <p className="text-sm text-muted-foreground">
                        <span className="text-neon-cyan">*</span> Vonix Network is an affiliate partner of UltraServers.
                        We may receive a commission for purchases made through our links at no extra cost to you.
                    </p>
                </div>
            </footer>
        </div>
    );
}
