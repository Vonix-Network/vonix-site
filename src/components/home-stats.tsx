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
            } catch (error) {
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
            icon: Users
        },
        {
            label: 'Servers',
            value: stats ? stats.servers.toString() : '...',
            icon: Server
        },
        {
            label: 'Total Donated',
            value: stats ? formatCurrency(stats.donations) : '...',
            icon: Heart
        },
        {
            label: 'Community',
            value: 'Active',
            icon: Star
        },
    ];

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12 max-w-4xl mx-auto">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="glass-card rounded-xl p-4 text-center h-28 flex items-center justify-center">
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
                    className="glass-card rounded-xl p-4 text-center hover-lift transition-all duration-300"
                >
                    <stat.icon className="w-6 h-6 mx-auto mb-2 text-neon-cyan" />
                    <div className="text-2xl font-bold gradient-text">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
            ))}
        </div>
    );
}
