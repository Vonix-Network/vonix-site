'use client';

import { useState, useEffect, useRef } from 'react';
import { Users, Server, Heart, Star } from 'lucide-react';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface StatsData {
    users: number;
    donations: number;
    servers: number;
}

interface HomeStatsProps {
    initialData?: StatsData;
}

export function HomeStats({ initialData }: HomeStatsProps) {
    const [stats, setStats] = useState<StatsData | null>(initialData || null);
    const [isLoading, setIsLoading] = useState(!initialData);
    const hasFetched = useRef(false);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch('/api/stats/public', {
                    cache: 'no-store',
                });
                if (response.ok) {
                    const data = await response.json();
                    setStats(data);
                    setIsLoading(false);
                }
            } catch (error: any) {
                console.error('Failed to fetch stats:', error);
            }
        };

        // Always fetch fresh data on mount (even if we have initialData)
        // This ensures the stats are live and not from a cached page render
        if (!hasFetched.current) {
            hasFetched.current = true;
            fetchStats();
        }

        // Poll every 10 seconds for real-time updates
        const intervalId = setInterval(fetchStats, 10000);

        return () => clearInterval(intervalId);
    }, []);

    const statCards = [
        {
            label: 'Total Members',
            value: stats ? formatNumber(stats.users) : '...',
            icon: Users,
            color: 'text-neon-cyan',
            glowColor: 'group-hover:shadow-[0_0_20px_rgba(0,217,255,0.3)]',
        },
        {
            label: 'Servers',
            value: stats ? stats.servers.toString() : '...',
            icon: Server,
            color: 'text-neon-purple',
            glowColor: 'group-hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]',
        },
        {
            label: 'Total Donated',
            value: stats ? formatCurrency(stats.donations) : '...',
            icon: Heart,
            color: 'text-neon-pink',
            glowColor: 'group-hover:shadow-[0_0_20px_rgba(236,72,153,0.3)]',
        },
        {
            label: 'Community',
            value: 'Active',
            icon: Star,
            color: 'text-success',
            glowColor: 'group-hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]',
        },
    ];

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12 max-w-4xl mx-auto">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="stat-card p-5 text-center h-28 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-neon-cyan/50" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12 max-w-4xl mx-auto">
            {statCards.map((stat, index) => (
                <div
                    key={index}
                    className={`group stat-card p-5 text-center transition-all duration-300 ${stat.glowColor}`}
                >
                    {/* Icon with colored background */}
                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 mb-3 ${stat.color} group-hover:scale-110 transition-transform`}>
                        <stat.icon className="w-5 h-5" />
                    </div>

                    {/* Value - Large and Bold */}
                    <div className={`text-2xl md:text-3xl font-bold ${stat.color} mb-1`}>
                        {stat.value}
                    </div>

                    {/* Label - Small and Muted */}
                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                        {stat.label}
                    </div>
                </div>
            ))}
        </div>
    );
}
