'use client';

import { useState } from 'react';
import {
    Server,
    Shield,
    ArrowRight,
    Zap,
    Sparkles,
    Cpu,
    HardDrive,
    Heart,
    Package,
    Cloud,
    Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const AFFILIATE_URL_ULTRA = 'https://ultraservers.com/aff.php?code=kJj5hk5koEMNj5Il';
const AFFILIATE_URL_DART = 'https://dartnode.com?aff=VonixNetwork';

// UltraServers (Minecraft) Plans
const mcPlans = [
    { ram: '4GB', vcores: 2, storage: 'Unlimited', price: 4, popular: false },
    { ram: '8GB', vcores: 4, storage: 'Unlimited', price: 8, popular: true },
    { ram: '12GB', vcores: 5, storage: 'Unlimited', price: 12, popular: false },
    { ram: '16GB', vcores: 6, storage: 'Unlimited', price: 16, popular: false },
];

/**
 * DartNode Products & Plans
 * Based on the user's provided screenshot/requests:
 * - Cloud VPS ($2/mo)
 * - NVMe VPS ($3/mo)
 * - Ryzen 9 VPS ($3/mo)
 * - VDS Slices ($4/mo, Popular)
 * - Block Storage ($0.05/GB)
 * - Bare Metal ($55/mo)
 */
const dartNodeProducts = [
    {
        title: 'Cloud VPS',
        desc: 'Standard KVM compute slices',
        price: '2',
        unit: '/mo',
        icon: Server,
        popular: false,
        action: 'Configure',
        details: [
            'Enterprise Intel Processors',
            '100% SSD Custom Storage',
            '10Gbps Network Uplink',
        ]
    },
    {
        title: 'NVMe VPS',
        desc: 'High I/O for databases',
        price: '3',
        unit: '/mo',
        icon: Zap,
        popular: false,
        action: 'Configure',
        details: [
            'High-Performance NVMe',
            'Low Latency R/W',
            'Ideal for DBs & Caching'
        ]
    },
    {
        title: 'Ryzen 9 VPS',
        desc: 'Extreme single-core performance',
        price: '3',
        unit: '/mo',
        icon: Cpu,
        popular: false,
        action: 'Configure',
        details: [
            'AMD Ryzen 9 7950X',
            'DDR5 Memory',
            'Game Server Optimized'
        ]
    },
    {
        title: 'VDS Slices',
        desc: 'Dedicated Cores & RAM (No Steal)',
        price: '4',
        unit: '/mo',
        icon: Package,
        popular: true,
        action: 'Build Now',
        details: [
            '100% Dedicated Resources',
            'No Noisy Neighbors',
            'KVM Virtualization'
        ]
    },
    {
        title: 'Block Storage',
        desc: 'Expandable SAS RAID-10 storage',
        price: '0.05',
        unit: '/GB',
        icon: HardDrive,
        popular: false,
        action: 'Add Storage',
        details: [
            'Scalable up to 10TB',
            'Redundant RAID-10',
            'Attach to any VPS'
        ]
    },
    {
        title: 'Bare Metal',
        desc: 'Single Tenant Dedicated Servers',
        price: '55',
        unit: '/mo',
        icon: Database,
        popular: false,
        action: 'View Stock',
        details: [
            'Full Hardware Access',
            'IPMI / KVM Access',
            'Custom OS Install'
        ]
    },
];

const features = {
    minecraft: [
        { icon: Cpu, title: 'Ryzen 9950X Power', desc: 'Extreme single-core performance for lag-free Minecraft.' },
        { icon: Zap, title: 'Instant Setup', desc: 'Server online in seconds after payment.' },
        { icon: Shield, title: 'DDoS Protection', desc: 'Terabit-scale mitigation included free.' },
    ],
    // General DartNode features based on their brand
    dartnode: [
        { icon: Cpu, title: 'Enterprise Hardware', desc: 'Powered by latest generation Intel & AMD Ryzen processors.' },
        { icon: Cloud, title: 'Global Network', desc: 'High-speed 10Gbps uplinks with DDoS protection available.' },
        { icon: HardDrive, title: 'NVMe Storage', desc: 'Enterprise-grade NVMe drives for maximum I/O performance.' },
    ]
};

export default function HostingPage() {
    const [activeTab, setActiveTab] = useState<'minecraft' | 'cloud'>('minecraft');

    const isMC = activeTab === 'minecraft';

    // Minecraft Theme (Green)
    const mcAccent = 'text-green-500';
    const mcShadow = 'shadow-[0_0_20px_rgba(34,197,94,0.3)]';
    const mcGradientText = 'bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent';

    // Cloud Theme (Orange/DartNode)
    const cloudAccent = 'text-orange-500';
    const cloudShadow = 'shadow-[0_0_20px_rgba(249,115,22,0.3)]';
    const cloudGradientText = 'bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent';

    const accentColor = isMC ? mcAccent : cloudAccent;

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-white/20 relative z-20 overflow-hidden">

            {/* 
              Global Gradient Background 
              - Replaces grid/noise with a smoother, deeper glow effect as requested.
            */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                {/* Top-center glow */}
                <div className={cn(
                    "absolute top-[-10%] left-1/2 -translate-x-1/2 w-[60vw] h-[60vh] rounded-full blur-[150px] opacity-20 transition-colors duration-1000",
                    isMC ? "bg-green-600" : "bg-orange-600"
                )} />

                {/* Bottom-left glow */}
                <div className={cn(
                    "absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vh] rounded-full blur-[120px] opacity-10 transition-colors duration-1000",
                    isMC ? "bg-emerald-600" : "bg-red-800"
                )} />

                {/* Subtle vignette */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050505_90%)]" />
            </div>

            <div className="container mx-auto px-4 pt-8 pb-32 relative z-10">

                {/* Header / Switcher */}
                <div className="flex justify-center mb-16">
                    <div className="inline-flex p-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                        <button
                            onClick={() => setActiveTab('minecraft')}
                            className={cn(
                                "px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2",
                                isMC
                                    ? "bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.5)]"
                                    : "text-muted-foreground hover:text-white"
                            )}
                        >
                            <Package className="w-4 h-4" />
                            Minecraft Hosting
                        </button>
                        <button
                            onClick={() => setActiveTab('cloud')}
                            className={cn(
                                "px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2",
                                !isMC
                                    ? "bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.5)]"
                                    : "text-muted-foreground hover:text-white"
                            )}
                        >
                            <Server className="w-4 h-4" />
                            Cloud Servers
                        </button>
                    </div>
                </div>

                {/* Hero / Headline */}
                <div className="text-center mb-20 space-y-6">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full text-xs font-bold uppercase tracking-wider border border-white/10 bg-white/5">
                            {isMC ? <Sparkles className="w-3 h-3 text-green-400" /> : <Zap className="w-3 h-3 text-orange-400" />}
                            <span className="text-gray-300">
                                Powered by <span className={isMC ? "text-green-400" : "text-orange-400"}>{isMC ? 'UltraServers' : 'DartNode'}</span>
                            </span>
                        </div>

                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-4">
                            {isMC ? (
                                <>
                                    <span className={mcGradientText}>Limitless</span> Minecraft Hosting
                                </>
                            ) : (
                                <>
                                    <span className={cloudGradientText}>High Performance</span> Cloud
                                </>
                            )}
                        </h1>

                        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                            {isMC
                                ? "Powered by Ryzen 9950X processors and NVMe storage. The ultimate platform for your Minecraft community."
                                : "Enterprise-grade hardware priced for developers. From NVMe VPS to Bare Metal servers."}
                        </p>
                    </motion.div>
                </div>

                {/* Feature Cards (3-up) */}
                <div className="grid md:grid-cols-3 gap-6 mb-24 max-w-5xl mx-auto">
                    {(isMC ? features.minecraft : features.dartnode).map((feat, i) => (
                        <Card key={i} className="bg-white/5 border-white/5 backdrop-blur-sm">
                            <CardContent className="p-6">
                                <feat.icon className={cn("w-8 h-8 mb-4", accentColor)} />
                                <h3 className="text-lg font-bold text-white mb-2">{feat.title}</h3>
                                <p className="text-sm text-gray-400 leading-relaxed">{feat.desc}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* 
                   PRICING GRID 
                   Render different cards for MC vs. DartNode 
                */}
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-white">
                            Available <span className={accentColor}>Plans</span>
                        </h2>
                    </div>

                    {isMC ? (
                        // MINECRAFT PLANS GRID
                        <div className="grid md:grid-cols-4 gap-6">
                            {mcPlans.map((plan, i) => (
                                <Card key={i} className={cn(
                                    "bg-[#0A0A0A] border-white/5 overflow-hidden group relative hover:-translate-y-1 transition-all duration-300 hover:shadow-2xl hover:shadow-green-900/10",
                                    plan.popular ? "border-green-500/50 ring-1 ring-green-500/20" : ""
                                )}>
                                    {plan.popular && (
                                        <div className="absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-bold bg-green-500 text-black uppercase">
                                            Popular
                                        </div>
                                    )}
                                    <CardContent className="p-8 flex flex-col items-center text-center h-full">
                                        <div className="mb-6 p-4 rounded-full bg-green-500/10 text-green-400 group-hover:bg-green-500 group-hover:text-black transition-colors duration-300">
                                            <Package className="w-8 h-8" />
                                        </div>

                                        <h3 className="text-xl font-bold text-white mb-2">{plan.ram} RAM</h3>
                                        <div className="text-gray-500 text-sm mb-6">Ryzen 9950X</div>

                                        <div className="mb-8">
                                            <span className="text-4xl font-bold text-white">${plan.price}</span>
                                            <span className="text-gray-500">/mo</span>
                                        </div>

                                        <ul className="space-y-3 mb-8 text-sm text-gray-400 w-full">
                                            <li className="flex items-center justify-center gap-2">
                                                <Cpu className="w-4 h-4 text-green-500" /> {plan.vcores} vCores
                                            </li>
                                            <li className="flex items-center justify-center gap-2">
                                                <HardDrive className="w-4 h-4 text-green-500" /> NVMe Storage
                                            </li>
                                            <li className="flex items-center justify-center gap-2">
                                                <Shield className="w-4 h-4 text-green-500" /> DDoS Protection
                                            </li>
                                        </ul>

                                        <Button className="w-full mt-auto bg-white/10 hover:bg-white/20 text-white font-semibold" asChild>
                                            <a href={AFFILIATE_URL_ULTRA} target="_blank" rel="noopener noreferrer">
                                                Order Now <ArrowRight className="w-4 h-4 ml-2" />
                                            </a>
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        // DARTNODE PRODUCTS GRID (Based on Request & Screenshot)
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {dartNodeProducts.map((prod, i) => (
                                <Card key={i} className={cn(
                                    "bg-[#0A0A0A] border-white/5 overflow-hidden group relative hover:-translate-y-1 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-900/10",
                                    prod.popular ? "border-orange-500/50 ring-1 ring-orange-500/20" : ""
                                )}>
                                    {prod.popular && (
                                        <div className="absolute top-0 right-0 px-3 py-1 rounded-bl-lg text-[10px] font-bold bg-orange-500 text-black uppercase z-10">
                                            Popular
                                        </div>
                                    )}
                                    <CardContent className="p-8 flex flex-col items-center text-center h-full">
                                        {/* Icon Box */}
                                        <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/5 group-hover:border-orange-500/50 transition-colors duration-300">
                                            <prod.icon className={cn("w-8 h-8", prod.popular ? "text-orange-400" : "text-orange-500/70 group-hover:text-orange-400")} />
                                        </div>

                                        <h3 className="text-xl font-bold text-white mb-2">{prod.title}</h3>
                                        <p className="text-gray-500 text-sm mb-6 min-h-[40px]">{prod.desc}</p>

                                        <div className="mb-8">
                                            <span className={cn("text-3xl font-bold", prod.popular ? "text-orange-400" : "text-white")}>
                                                ${prod.price}
                                            </span>
                                            <span className="text-gray-500 text-sm">{prod.unit}</span>
                                        </div>

                                        <Button
                                            className={cn(
                                                "w-full mt-auto font-semibold transition-all",
                                                prod.popular
                                                    ? "bg-orange-500 hover:bg-orange-400 text-black shadow-lg shadow-orange-900/20"
                                                    : "bg-white/5 hover:bg-white/10 text-white border border-white/5"
                                            )}
                                            asChild
                                        >
                                            <a href={AFFILIATE_URL_DART} target="_blank" rel="noopener noreferrer">
                                                {prod.action} <ArrowRight className="w-3 h-3 ml-2" />
                                            </a>
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Note */}
                <div className="mt-32 text-center border-t border-white/5 pt-12">
                    <p className="text-gray-500 text-sm">
                        Vonix Network provided services via our trusted partners <span className="text-green-400 font-bold">UltraServers</span> and <span className="text-orange-400 font-bold">DartNode</span>.
                        <br />
                        <span className="opacity-50">Support the network with every purchase.</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
