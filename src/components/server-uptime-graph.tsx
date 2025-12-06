'use client';

import { useState, useEffect } from 'react';
import { Activity, Users, Loader2, Wifi, WifiOff, BarChart3, List } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

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

type DataView = 'uptime' | 'players';
type Granularity = 'minutely' | 'hourly';

// Custom tooltip component matching admin dashboard style
const CustomTooltip = ({ active, payload, label, dataView }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                <p className="text-sm font-medium text-foreground mb-1">{label}</p>
                {dataView === 'uptime' ? (
                    <>
                        <p className="text-sm text-success">Online: {data.online || 0}</p>
                        <p className="text-sm text-error">Offline: {data.offline || 0}</p>
                        <p className="text-sm text-neon-cyan">
                            Uptime: {data.uptimePercent?.toFixed(1) || 0}%
                        </p>
                    </>
                ) : (
                    <>
                        <p className="text-sm text-neon-purple">
                            Players: {data.players || data.avgPlayers || 0}
                        </p>
                        {data.maxSlots > 0 && (
                            <p className="text-sm text-muted-foreground">
                                Max Slots: {data.maxSlots}
                            </p>
                        )}
                    </>
                )}
            </div>
        );
    }
    return null;
};

export function ServerUptimeGraph({ serverId }: ServerUptimeGraphProps) {
    const [records, setRecords] = useState<UptimeRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dataView, setDataView] = useState<DataView>('uptime');
    const [granularity, setGranularity] = useState<Granularity>('hourly');
    const [selectedDays, setSelectedDays] = useState<number>(1);

    useEffect(() => {
        fetchUptimeData();
    }, [serverId, selectedDays]);

    const fetchUptimeData = async () => {
        setIsLoading(true);
        try {
            // For 1h option, we still request 1 day but will filter on frontend
            const daysToFetch = selectedDays < 1 ? 1 : selectedDays;
            const res = await fetch(`/api/servers/${serverId}/uptime?days=${daysToFetch}`);
            if (res.ok) {
                const data = await res.json();
                let fetchedRecords = data.records || [];

                // If 1h selected, filter to last hour only
                if (selectedDays < 1) {
                    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
                    fetchedRecords = fetchedRecords.filter(
                        (r: UptimeRecord) => new Date(r.checkedAt) >= oneHourAgo
                    );
                }

                setRecords(fetchedRecords);
            }
        } catch (error) {
            console.error('Failed to fetch uptime data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate stats
    const uptimePercentage = records.length > 0
        ? (records.filter(r => r.online).length / records.length) * 100
        : 0;

    const avgResponseTime = records.length > 0
        ? Math.round(
            records
                .filter(r => r.responseTimeMs)
                .reduce((sum, r) => sum + (r.responseTimeMs || 0), 0) /
            Math.max(records.filter(r => r.responseTimeMs).length, 1)
        )
        : 0;

    const avgPlayers = records.length > 0
        ? Math.round(
            records
                .filter(r => r.playersOnline !== null)
                .reduce((sum, r) => sum + (r.playersOnline || 0), 0) /
            Math.max(records.filter(r => r.playersOnline !== null).length, 1)
        )
        : 0;

    const peakPlayers = Math.max(...records.map(r => r.playersOnline || 0), 0);
    const maxSlots = Math.max(...records.map(r => r.playersMax || 0), 1);

    // Sort records by time (oldest first)
    const sortedRecords = [...records].sort(
        (a, b) => new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime()
    );

    // Prepare minutely data for charts
    const minutelyChartData = sortedRecords.slice(-60).map(record => {
        const date = new Date(record.checkedAt);
        return {
            label: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            fullTime: date.toLocaleString(),
            online: record.online ? 1 : 0,
            offline: record.online ? 0 : 1,
            uptimePercent: record.online ? 100 : 0,
            players: record.playersOnline || 0,
            maxSlots: record.playersMax || 0,
            isOnline: record.online,
        };
    });

    // Prepare hourly aggregated data
    const hourlyChartData: any[] = [];
    if (records.length > 0) {
        const grouped = new Map<string, { online: number; offline: number; players: number[]; max: number }>();

        records.forEach(record => {
            const date = new Date(record.checkedAt);
            const hourKey = date.toISOString().substring(0, 13);
            if (!grouped.has(hourKey)) {
                grouped.set(hourKey, { online: 0, offline: 0, players: [], max: 0 });
            }
            const data = grouped.get(hourKey)!;
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

        const sortedHours = Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));

        sortedHours.forEach(([hourKey, data]) => {
            const date = new Date(hourKey + ':00:00');
            const total = data.online + data.offline;
            hourlyChartData.push({
                label: date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit' }),
                fullTime: date.toLocaleString(),
                online: data.online,
                offline: data.offline,
                uptimePercent: total > 0 ? (data.online / total) * 100 : 0,
                avgPlayers: data.players.length > 0
                    ? Math.round(data.players.reduce((a, b) => a + b, 0) / data.players.length)
                    : 0,
                maxSlots: data.max,
            });
        });
    }

    // Select data based on granularity
    const chartData = granularity === 'minutely'
        ? minutelyChartData
        : hourlyChartData.slice(-48); // Last 48 hours max

    const getUptimeColor = (percentage: number) => {
        if (percentage >= 99) return 'text-success';
        if (percentage >= 95) return 'text-neon-cyan';
        if (percentage >= 90) return 'text-warning';
        return 'text-error';
    };

    // Bar colors for uptime chart
    const getBarColor = (entry: any) => {
        if (granularity === 'minutely') {
            return entry.isOnline ? '#22c55e' : '#ef4444';
        }
        // Hourly - color by uptime percentage
        if (entry.uptimePercent >= 100) return '#22c55e';
        if (entry.uptimePercent >= 50) return '#eab308';
        return '#ef4444';
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

                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Data View Toggle */}
                        <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50">
                            <button
                                onClick={() => setDataView('uptime')}
                                className={`px-3 py-1 rounded text-xs font-medium transition-all ${dataView === 'uptime'
                                    ? 'bg-success text-white'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <Wifi className="w-3 h-3 inline mr-1" />
                                Uptime
                            </button>
                            <button
                                onClick={() => setDataView('players')}
                                className={`px-3 py-1 rounded text-xs font-medium transition-all ${dataView === 'players'
                                    ? 'bg-neon-purple text-white'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <Users className="w-3 h-3 inline mr-1" />
                                Players
                            </button>
                        </div>

                        {/* Granularity Toggle */}
                        <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50">
                            <button
                                onClick={() => setGranularity('minutely')}
                                className={`px-3 py-1 rounded text-xs font-medium transition-all ${granularity === 'minutely'
                                    ? 'bg-neon-cyan text-white'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <List className="w-3 h-3 inline mr-1" />
                                Minutely
                            </button>
                            <button
                                onClick={() => setGranularity('hourly')}
                                className={`px-3 py-1 rounded text-xs font-medium transition-all ${granularity === 'hourly'
                                    ? 'bg-neon-cyan text-white'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <BarChart3 className="w-3 h-3 inline mr-1" />
                                Hourly
                            </button>
                        </div>

                        {/* Time Range */}
                        <div className="inline-flex rounded-full border border-border bg-background/40 p-0.5">
                            {[
                                { label: '1h', days: 0.042 },
                                { label: '24h', days: 1 },
                                { label: '7d', days: 7 },
                                { label: '30d', days: 30 },
                            ].map(option => (
                                <button
                                    key={option.label}
                                    onClick={() => setSelectedDays(option.days)}
                                    className={`px-2 py-0.5 rounded-full text-xs transition ${selectedDays === option.days
                                        ? 'bg-primary text-primary-foreground shadow'
                                        : 'text-muted-foreground hover:bg-muted/40'
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
                <div className="grid grid-cols-4 gap-3">
                    <div className="text-center p-3 rounded-lg bg-secondary/30">
                        <p className={`text-lg font-bold ${getUptimeColor(uptimePercentage)}`}>
                            {uptimePercentage.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">Uptime</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-secondary/30">
                        <p className="text-lg font-bold text-neon-cyan">{avgResponseTime}ms</p>
                        <p className="text-xs text-muted-foreground">Avg Ping</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-secondary/30">
                        <p className="text-lg font-bold text-neon-purple">{avgPlayers}</p>
                        <p className="text-xs text-muted-foreground">Avg Players</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-secondary/30">
                        <p className="text-lg font-bold text-warning">{peakPlayers}</p>
                        <p className="text-xs text-muted-foreground">Peak Players</p>
                    </div>
                </div>

                {/* Chart */}
                <div className="h-48">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="uptimeGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.3} />
                                    </linearGradient>
                                    <linearGradient id="playersGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0.3} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis
                                    dataKey="label"
                                    stroke="rgba(255,255,255,0.5)"
                                    fontSize={10}
                                    tickLine={false}
                                    interval="preserveStartEnd"
                                />
                                <YAxis
                                    stroke="rgba(255,255,255,0.5)"
                                    fontSize={10}
                                    tickLine={false}
                                    allowDecimals={false}
                                    domain={dataView === 'uptime' ? [0, 100] : [0, 'auto']}
                                    tickFormatter={(value) => dataView === 'uptime' ? `${value}%` : value}
                                />
                                <Tooltip
                                    content={<CustomTooltip dataView={dataView} />}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                {dataView === 'uptime' ? (
                                    <Bar
                                        dataKey="uptimePercent"
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={30}
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
                                        ))}
                                    </Bar>
                                ) : (
                                    <Bar
                                        dataKey={granularity === 'minutely' ? 'players' : 'avgPlayers'}
                                        fill="url(#playersGradient)"
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={30}
                                    />
                                )}
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                                <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>No data available yet</p>
                                <p className="text-xs mt-1">Checks run every minute</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground flex-wrap">
                    {dataView === 'uptime' && (
                        <>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-sm bg-success" />
                                <span>100% Online</span>
                            </div>
                            {granularity === 'hourly' && (
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-sm bg-warning" />
                                    <span>Partial</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-sm bg-error" />
                                <span>Offline</span>
                            </div>
                        </>
                    )}
                    {dataView === 'players' && (
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-sm bg-neon-purple/70" />
                            <span>{granularity === 'hourly' ? 'Avg Players/Hour' : 'Player Count'}</span>
                        </div>
                    )}
                    <span>|</span>
                    <span>{records.length} checks</span>
                </div>
            </CardContent>
        </Card>
    );
}

export default ServerUptimeGraph;

