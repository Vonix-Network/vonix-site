'use client';

import { useState, useEffect } from 'react';
import { Activity, Users, Clock, TrendingUp, Loader2, Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface UptimeRecord {
    id: number;
    serverId: number;
    online: boolean;
    playersOnline: number | null;
    playersMax: number | null;
    responseTimeMs: number | null;
    checkedAt: string;
}

interface ServerUptimeGraphProps {
    serverId: number;
}

type ViewMode = 'uptime' | 'players';

export function ServerUptimeGraph({ serverId }: ServerUptimeGraphProps) {
    const [records, setRecords] = useState<UptimeRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('uptime');
    const [selectedDays, setSelectedDays] = useState<number>(7);

    useEffect(() => {
        fetchUptimeData();
    }, [serverId, selectedDays]);

    const fetchUptimeData = async () => {
        try {
            const res = await fetch(`/api/servers/${serverId}/uptime?days=${selectedDays}`);
            if (res.ok) {
                const data = await res.json();
                setRecords(data.records || []);
            }
        } catch (error) {
            console.error('Failed to fetch uptime data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate uptime percentage
    const uptimePercentage = records.length > 0
        ? (records.filter(r => r.online).length / records.length) * 100
        : 0;

    // Calculate average response time
    const avgResponseTime = records.length > 0
        ? Math.round(
            records
                .filter(r => r.responseTimeMs)
                .reduce((sum, r) => sum + (r.responseTimeMs || 0), 0) /
            Math.max(records.filter(r => r.responseTimeMs).length, 1)
        )
        : 0;

    // Calculate average players
    const avgPlayers = records.length > 0
        ? Math.round(
            records
                .filter(r => r.playersOnline !== null)
                .reduce((sum, r) => sum + (r.playersOnline || 0), 0) /
            Math.max(records.filter(r => r.playersOnline !== null).length, 1)
        )
        : 0;

    // Get max value for chart scaling
    const maxPlayers = Math.max(...records.map(r => r.playersMax || r.playersOnline || 0), 1);
    const maxOnlineCount = Math.max(...records.map(() => 1), 1); // For uptime, max is always 1 (online)

    // Group records by hour for chart
    const groupedData: { timestamp: string; online: number; offline: number; avgPlayers: number; maxPlayers: number }[] = [];

    if (records.length > 0) {
        const hourlyData = new Map<string, { online: number; offline: number; players: number[]; max: number }>();

        records.forEach(record => {
            const hour = new Date(record.checkedAt).toISOString().substring(0, 13) + ':00:00';
            if (!hourlyData.has(hour)) {
                hourlyData.set(hour, { online: 0, offline: 0, players: [], max: 0 });
            }
            const data = hourlyData.get(hour)!;
            if (record.online) {
                data.online++;
            } else {
                data.offline++;
            }
            if (record.playersOnline !== null) {
                data.players.push(record.playersOnline);
            }
            if (record.playersMax) {
                data.max = Math.max(data.max, record.playersMax);
            }
        });

        hourlyData.forEach((data, timestamp) => {
            groupedData.push({
                timestamp,
                online: data.online,
                offline: data.offline,
                avgPlayers: data.players.length > 0
                    ? Math.round(data.players.reduce((a, b) => a + b, 0) / data.players.length)
                    : 0,
                maxPlayers: data.max,
            });
        });

        groupedData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }

    const getUptimeColor = (percentage: number) => {
        if (percentage >= 99) return 'text-success';
        if (percentage >= 95) return 'text-neon-cyan';
        if (percentage >= 90) return 'text-warning';
        return 'text-error';
    };

    if (isLoading) {
        return (
            <Card variant="glass">
                <CardContent className="py-12 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-neon-cyan" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card variant="glass">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="w-4 h-4 text-neon-cyan" />
                        Server Statistics
                    </CardTitle>

                    <div className="flex items-center gap-3">
                        {/* View Mode Toggle */}
                        <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50">
                            <button
                                onClick={() => setViewMode('uptime')}
                                className={`px-3 py-1 rounded text-xs font-medium transition-all ${viewMode === 'uptime'
                                        ? 'bg-neon-cyan text-white'
                                        : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <Wifi className="w-3 h-3 inline mr-1" />
                                Uptime
                            </button>
                            <button
                                onClick={() => setViewMode('players')}
                                className={`px-3 py-1 rounded text-xs font-medium transition-all ${viewMode === 'players'
                                        ? 'bg-neon-purple text-white'
                                        : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <Users className="w-3 h-3 inline mr-1" />
                                Players
                            </button>
                        </div>

                        {/* Time Range */}
                        <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50">
                            {[
                                { label: '24h', days: 1 },
                                { label: '7d', days: 7 },
                                { label: '30d', days: 30 },
                            ].map(option => (
                                <button
                                    key={option.days}
                                    onClick={() => setSelectedDays(option.days)}
                                    className={`px-2 py-1 rounded text-xs font-medium transition-all ${selectedDays === option.days
                                            ? 'bg-foreground/10 text-foreground'
                                            : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 rounded-lg bg-secondary/30">
                        <p className={`text-lg font-bold ${getUptimeColor(uptimePercentage)}`}>
                            {uptimePercentage.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">Uptime</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-secondary/30">
                        <p className="text-lg font-bold text-neon-cyan">{avgResponseTime}ms</p>
                        <p className="text-xs text-muted-foreground">Avg Response</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-secondary/30">
                        <p className="text-lg font-bold text-neon-purple">{avgPlayers}</p>
                        <p className="text-xs text-muted-foreground">Avg Players</p>
                    </div>
                </div>

                {/* Graph */}
                {groupedData.length > 0 ? (
                    <div className="h-32 flex items-end gap-0.5">
                        {groupedData.slice(-48).map((point, index) => {
                            if (viewMode === 'uptime') {
                                const total = point.online + point.offline;
                                const uptimeHeight = total > 0 ? (point.online / total) * 100 : 0;

                                return (
                                    <div
                                        key={index}
                                        className="flex-1 flex flex-col justify-end group relative"
                                        style={{ minWidth: '4px' }}
                                    >
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                            <div className="bg-card border border-border rounded-lg p-2 text-xs whitespace-nowrap shadow-lg">
                                                <p className="font-medium">{new Date(point.timestamp).toLocaleString()}</p>
                                                <p className="text-success">Online: {point.online}</p>
                                                <p className="text-error">Offline: {point.offline}</p>
                                            </div>
                                        </div>

                                        <div
                                            className={`rounded-t-sm transition-all ${uptimeHeight >= 100 ? 'bg-success' : uptimeHeight >= 50 ? 'bg-warning' : 'bg-error'
                                                }`}
                                            style={{ height: `${uptimeHeight}%`, minHeight: '2px' }}
                                        />
                                    </div>
                                );
                            } else {
                                // Player count view
                                const playerHeight = (point.avgPlayers / maxPlayers) * 100;

                                return (
                                    <div
                                        key={index}
                                        className="flex-1 flex flex-col justify-end group relative"
                                        style={{ minWidth: '4px' }}
                                    >
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                            <div className="bg-card border border-border rounded-lg p-2 text-xs whitespace-nowrap shadow-lg">
                                                <p className="font-medium">{new Date(point.timestamp).toLocaleString()}</p>
                                                <p className="text-neon-purple">Avg Players: {point.avgPlayers}</p>
                                                {point.maxPlayers > 0 && (
                                                    <p className="text-muted-foreground">Max Slots: {point.maxPlayers}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div
                                            className="bg-neon-purple/70 rounded-t-sm transition-all"
                                            style={{ height: `${Math.max(playerHeight, 2)}%`, minHeight: '2px' }}
                                        />
                                    </div>
                                );
                            }
                        })}
                    </div>
                ) : (
                    <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                        <div className="text-center">
                            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No data available yet</p>
                        </div>
                    </div>
                )}

                {/* Legend */}
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                    {viewMode === 'uptime' ? (
                        <>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-sm bg-success" />
                                <span>Online</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-sm bg-error" />
                                <span>Offline</span>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-sm bg-neon-purple/70" />
                            <span>Player Count</span>
                        </div>
                    )}
                    <span>|</span>
                    <span>Last {selectedDays} day{selectedDays > 1 ? 's' : ''}</span>
                </div>
            </CardContent>
        </Card>
    );
}

export default ServerUptimeGraph;
