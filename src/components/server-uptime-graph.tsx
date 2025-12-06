'use client';

import { useState, useEffect } from 'react';
import { Activity, Users, Clock, Loader2, Wifi, WifiOff, ChevronDown, BarChart3, List } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

export function ServerUptimeGraph({ serverId }: ServerUptimeGraphProps) {
    const [records, setRecords] = useState<UptimeRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dataView, setDataView] = useState<DataView>('uptime');
    const [granularity, setGranularity] = useState<Granularity>('minutely');
    const [selectedDays, setSelectedDays] = useState<number>(1);
    const [expandedView, setExpandedView] = useState(false);

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

    // Calculate average and max players
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

    // Sort records by time (oldest first for display)
    const sortedRecords = [...records].sort(
        (a, b) => new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime()
    );

    // For minutely view - show last N records based on view
    const displayRecords = expandedView
        ? sortedRecords
        : sortedRecords.slice(-120); // Last 2 hours (120 minutes)

    // Group records by hour for hourly views
    const hourlyData: { timestamp: string; online: number; offline: number; avgPlayers: number; maxPlayers: number }[] = [];

    if (records.length > 0) {
        const grouped = new Map<string, { online: number; offline: number; players: number[]; max: number }>();

        records.forEach(record => {
            const hour = new Date(record.checkedAt).toISOString().substring(0, 13) + ':00:00';
            if (!grouped.has(hour)) {
                grouped.set(hour, { online: 0, offline: 0, players: [], max: 0 });
            }
            const data = grouped.get(hour)!;
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

        grouped.forEach((data, timestamp) => {
            hourlyData.push({
                timestamp,
                online: data.online,
                offline: data.offline,
                avgPlayers: data.players.length > 0
                    ? Math.round(data.players.reduce((a, b) => a + b, 0) / data.players.length)
                    : 0,
                maxPlayers: data.max,
            });
        });

        hourlyData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }

    const getUptimeColor = (percentage: number) => {
        if (percentage >= 99) return 'text-success';
        if (percentage >= 95) return 'text-neon-cyan';
        if (percentage >= 90) return 'text-warning';
        return 'text-error';
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDateTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
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
                        {/* Data View Toggle (Uptime vs Players) */}
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

                        {/* Granularity Toggle (Minutely vs Hourly) */}
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
                        <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50">
                            {[
                                { label: '1h', days: 0.042 },
                                { label: '24h', days: 1 },
                                { label: '7d', days: 7 },
                                { label: '30d', days: 30 },
                            ].map(option => (
                                <button
                                    key={option.label}
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

                {/* ==================== MINUTELY VIEW ==================== */}
                {granularity === 'minutely' && (
                    <>
                        {displayRecords.length > 0 ? (
                            <div className="space-y-2">
                                {/* Visual Timeline Bar */}
                                <div className="h-10 flex gap-px rounded-lg overflow-hidden bg-secondary/30">
                                    {displayRecords.map((record) => {
                                        if (dataView === 'uptime') {
                                            return (
                                                <div
                                                    key={record.id}
                                                    className="flex-1 group relative cursor-pointer min-w-[2px]"
                                                >
                                                    <div
                                                        className={`h-full transition-all ${record.online
                                                                ? 'bg-success hover:bg-success/80'
                                                                : 'bg-error hover:bg-error/80'
                                                            }`}
                                                    />
                                                    {/* Tooltip */}
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                                                        <div className="bg-card border border-border rounded-lg p-2 text-xs whitespace-nowrap shadow-xl">
                                                            <p className="font-medium">{formatDateTime(record.checkedAt)}</p>
                                                            <div className="flex items-center gap-1 mt-1">
                                                                {record.online ? (
                                                                    <><Wifi className="w-3 h-3 text-success" /><span className="text-success">Online</span></>
                                                                ) : (
                                                                    <><WifiOff className="w-3 h-3 text-error" /><span className="text-error">Offline</span></>
                                                                )}
                                                            </div>
                                                            <p className="text-neon-purple mt-1">
                                                                <Users className="w-3 h-3 inline mr-1" />
                                                                {record.playersOnline || 0} / {record.playersMax || '?'} players
                                                            </p>
                                                            {record.responseTimeMs && (
                                                                <p className="text-muted-foreground">
                                                                    {record.responseTimeMs}ms ping
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        } else {
                                            // Players view
                                            const playerHeight = maxSlots > 0 ? ((record.playersOnline || 0) / maxSlots) * 100 : 0;
                                            return (
                                                <div
                                                    key={record.id}
                                                    className="flex-1 flex flex-col justify-end group relative cursor-pointer min-w-[2px]"
                                                >
                                                    <div
                                                        className={`rounded-t-sm transition-all ${record.online ? 'bg-neon-purple/70 hover:bg-neon-purple' : 'bg-error/50'}`}
                                                        style={{ height: `${Math.max(playerHeight, 5)}%`, minHeight: '2px' }}
                                                    />
                                                    {/* Tooltip */}
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                                                        <div className="bg-card border border-border rounded-lg p-2 text-xs whitespace-nowrap shadow-xl">
                                                            <p className="font-medium">{formatDateTime(record.checkedAt)}</p>
                                                            <p className="text-neon-purple mt-1">
                                                                {record.playersOnline || 0} / {record.playersMax || '?'} players
                                                            </p>
                                                            <p className={record.online ? 'text-success' : 'text-error'}>
                                                                {record.online ? 'Server Online' : 'Server Offline'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                    })}
                                </div>

                                {/* Time labels */}
                                <div className="flex justify-between text-xs text-muted-foreground px-1">
                                    <span>{displayRecords[0] ? formatTime(displayRecords[0].checkedAt) : ''}</span>
                                    <span>{displayRecords[Math.floor(displayRecords.length / 2)] ? formatTime(displayRecords[Math.floor(displayRecords.length / 2)].checkedAt) : ''}</span>
                                    <span>{displayRecords[displayRecords.length - 1] ? formatTime(displayRecords[displayRecords.length - 1].checkedAt) : ''}</span>
                                </div>

                                {/* Recent Events List */}
                                <div className="mt-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-medium text-muted-foreground">Recent Checks ({records.length} total)</p>
                                        <button
                                            onClick={() => setExpandedView(!expandedView)}
                                            className="text-xs text-neon-cyan hover:underline flex items-center gap-1"
                                        >
                                            {expandedView ? 'Show Less' : 'Show All'}
                                            <ChevronDown className={`w-3 h-3 transition-transform ${expandedView ? 'rotate-180' : ''}`} />
                                        </button>
                                    </div>
                                    <div className={`space-y-1 ${expandedView ? 'max-h-64' : 'max-h-32'} overflow-y-auto`}>
                                        {[...records].slice(0, expandedView ? 50 : 10).map((record) => (
                                            <div
                                                key={record.id}
                                                className="flex items-center justify-between py-1.5 px-2 rounded bg-secondary/20 text-xs"
                                            >
                                                <div className="flex items-center gap-2">
                                                    {record.online ? (
                                                        <Wifi className="w-3 h-3 text-success" />
                                                    ) : (
                                                        <WifiOff className="w-3 h-3 text-error" />
                                                    )}
                                                    <span className="text-muted-foreground">
                                                        {formatDateTime(record.checkedAt)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={record.online ? 'text-success' : 'text-error'}>
                                                        {record.online ? 'Online' : 'Offline'}
                                                    </span>
                                                    <span className="text-neon-purple">
                                                        {record.playersOnline || 0} players
                                                    </span>
                                                    {record.responseTimeMs && (
                                                        <span className="text-muted-foreground">
                                                            {record.responseTimeMs}ms
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                                <div className="text-center">
                                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>No data available yet</p>
                                    <p className="text-xs mt-1">Checks run every minute</p>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* ==================== HOURLY VIEW ==================== */}
                {granularity === 'hourly' && (
                    <>
                        {hourlyData.length > 0 ? (
                            <div className="space-y-2">
                                <div className="h-32 flex items-end gap-1">
                                    {hourlyData.slice(-48).map((point, index) => {
                                        if (dataView === 'uptime') {
                                            const total = point.online + point.offline;
                                            const uptimeHeight = total > 0 ? (point.online / total) * 100 : 0;

                                            return (
                                                <div
                                                    key={index}
                                                    className="flex-1 flex flex-col justify-end group relative"
                                                    style={{ minWidth: '6px' }}
                                                >
                                                    {/* Tooltip */}
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                                        <div className="bg-card border border-border rounded-lg p-2 text-xs whitespace-nowrap shadow-lg">
                                                            <p className="font-medium">{new Date(point.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                                            <p className="text-success">Online checks: {point.online}</p>
                                                            <p className="text-error">Offline checks: {point.offline}</p>
                                                            <p className="text-muted-foreground">Uptime: {total > 0 ? Math.round((point.online / total) * 100) : 0}%</p>
                                                        </div>
                                                    </div>

                                                    <div
                                                        className={`rounded-t-sm transition-all cursor-pointer ${uptimeHeight >= 100 ? 'bg-success hover:bg-success/80'
                                                                : uptimeHeight >= 50 ? 'bg-warning hover:bg-warning/80'
                                                                    : 'bg-error hover:bg-error/80'
                                                            }`}
                                                        style={{ height: `${uptimeHeight}%`, minHeight: '4px' }}
                                                    />
                                                </div>
                                            );
                                        } else {
                                            // Player count view
                                            const maxPlayersInPeriod = Math.max(...hourlyData.map(p => p.avgPlayers), 1);
                                            const playerHeight = (point.avgPlayers / maxPlayersInPeriod) * 100;

                                            return (
                                                <div
                                                    key={index}
                                                    className="flex-1 flex flex-col justify-end group relative"
                                                    style={{ minWidth: '6px' }}
                                                >
                                                    {/* Tooltip */}
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                                        <div className="bg-card border border-border rounded-lg p-2 text-xs whitespace-nowrap shadow-lg">
                                                            <p className="font-medium">{new Date(point.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                                            <p className="text-neon-purple">Avg Players: {point.avgPlayers}</p>
                                                            {point.maxPlayers > 0 && (
                                                                <p className="text-muted-foreground">Max Slots: {point.maxPlayers}</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div
                                                        className="bg-neon-purple/70 hover:bg-neon-purple rounded-t-sm transition-all cursor-pointer"
                                                        style={{ height: `${Math.max(playerHeight, 5)}%`, minHeight: '4px' }}
                                                    />
                                                </div>
                                            );
                                        }
                                    })}
                                </div>

                                {/* Time labels for hourly */}
                                <div className="flex justify-between text-xs text-muted-foreground px-1">
                                    {hourlyData.length > 0 && (
                                        <>
                                            <span>{new Date(hourlyData[Math.max(0, hourlyData.length - 48)].timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit' })}</span>
                                            <span>{new Date(hourlyData[hourlyData.length - 1].timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit' })}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                                <div className="text-center">
                                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>No data available yet</p>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Legend */}
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground flex-wrap">
                    {dataView === 'uptime' && (
                        <>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-sm bg-success" />
                                <span>Online</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-sm bg-error" />
                                <span>Offline</span>
                            </div>
                            {granularity === 'hourly' && (
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-sm bg-warning" />
                                    <span>Partial</span>
                                </div>
                            )}
                        </>
                    )}
                    {dataView === 'players' && (
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-sm bg-neon-purple/70" />
                            <span>{granularity === 'hourly' ? 'Avg Players/Hour' : 'Player Count'}</span>
                        </div>
                    )}
                    <span>|</span>
                    <span>{records.length} checks • {granularity === 'hourly' ? `${hourlyData.length} hours` : 'per minute'}</span>
                </div>
            </CardContent>
        </Card>
    );
}

export default ServerUptimeGraph;
