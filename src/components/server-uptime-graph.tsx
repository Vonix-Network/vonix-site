'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Activity, Users, Loader2, Wifi, BarChart3, List, AlertCircle, ArrowLeft, ZoomIn } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface UptimeRecord {
    id: number;
    serverId: number;
    online: boolean;
    playersOnline: number | null;
    playersMax: number | null;
    responseTimeMs: number | null;
    checkedAt: string | Date;
    // Aggregated data fields (present when API returns hourly data)
    _aggregated?: boolean;
    _onlineCount?: number;
    _offlineCount?: number;
    _totalChecks?: number;
    _uptimePercent?: number;
}

interface ApiResponse {
    records: UptimeRecord[];
    aggregated: boolean;
    stats: {
        uptimePercentage: number;
        avgResponseTime: number;
        avgPlayers: number;
        maxPlayers: number;
        totalChecks: number;
        onlineChecks: number;
    };
}

interface ServerUptimeGraphProps {
    serverId: number;
}

type DataView = 'uptime' | 'players';
type Granularity = 'minutely' | 'hourly';

interface ChartDataPoint {
    label: string;
    fullTime: string;
    online: number;
    offline: number;
    uptimePercent: number;
    players: number;
    avgPlayers: number;
    maxSlots: number;
    isOnline: boolean;
    hourKey?: string; // For drilldown - format: YYYY-MM-DDTHH
}

// =============================================================================
// TIME RANGE CONFIGURATION
// =============================================================================

/**
 * Time range options with their properties:
 * - label: Display text
 * - days: Number of days to request from API
 * - hours: Number of hours this range represents (for display logic)
 * - hasMinutelyData: Whether raw minutely data is available (only for short ranges)
 * - maxMinutelyBars: Maximum bars to show in minutely view
 * - maxHourlyBars: Maximum bars to show in hourly view
 */
const TIME_RANGES = [
    {
        label: '1h',
        days: 1,  // Request 1 day from API, filter on frontend
        hours: 1,
        hasMinutelyData: true,
        maxMinutelyBars: 60,    // 60 minutes
        maxHourlyBars: 1,       // 1 hour
    },
    {
        label: '24h',
        days: 1,
        hours: 24,
        hasMinutelyData: true,
        maxMinutelyBars: 1440,  // 24 * 60 minutes
        maxHourlyBars: 24,      // 24 hours
    },
    {
        label: '7d',
        days: 7,
        hours: 168,
        hasMinutelyData: false, // Too many points, API aggregates
        maxMinutelyBars: 0,     // Not available
        maxHourlyBars: 168,     // 7 * 24 hours
    },
    {
        label: '30d',
        days: 30,
        hours: 720,
        hasMinutelyData: false,
        maxMinutelyBars: 0,
        maxHourlyBars: 720,     // 30 * 24 hours
    },
    {
        label: '60d',
        days: 60,
        hours: 1440,
        hasMinutelyData: false,
        maxMinutelyBars: 0,
        maxHourlyBars: 1440,    // 60 * 24 hours
    },
    {
        label: '90d',
        days: 90,
        hours: 2160,
        hasMinutelyData: false,
        maxMinutelyBars: 0,
        maxHourlyBars: 2160,    // 90 * 24 hours
    },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Parse date from various formats (Date object, ISO string, Unix timestamp)
 */
function parseDate(value: string | Date | number): Date {
    if (value instanceof Date) return value;
    if (typeof value === 'number') {
        // Unix timestamp (seconds) - Drizzle SQLite returns this
        return new Date(value * 1000);
    }
    // ISO string or date string
    return new Date(value);
}

/**
 * Format date for chart label based on granularity
 */
function formatLabel(date: Date, granularity: Granularity, rangeHours: number): string {
    if (granularity === 'minutely') {
        // For minutely, show time only
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    // For hourly, include date for ranges > 24h
    if (rangeHours > 24) {
        return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit' });
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// =============================================================================
// CUSTOM TOOLTIP COMPONENT
// =============================================================================

const CustomTooltip = ({ active, payload, dataView, granularity }: any) => {
    if (!active || !payload?.length) return null;

    const data = payload[0].payload;
    return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
            <p className="text-sm font-medium text-foreground mb-1">{data.fullTime}</p>
            {dataView === 'uptime' ? (
                <>
                    {granularity === 'hourly' && (
                        <>
                            <p className="text-sm text-success">Online checks: {data.online || 0}</p>
                            <p className="text-sm text-error">Offline checks: {data.offline || 0}</p>
                        </>
                    )}
                    <p className="text-sm text-neon-cyan">
                        Uptime: {data.uptimePercent?.toFixed(1) || 0}%
                    </p>
                </>
            ) : (
                <>
                    <p className="text-sm text-neon-purple">
                        Players: {granularity === 'hourly' ? data.avgPlayers : data.players}
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
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ServerUptimeGraph({ serverId }: ServerUptimeGraphProps) {
    // State
    const [records, setRecords] = useState<UptimeRecord[]>([]);
    const [isAggregated, setIsAggregated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [dataView, setDataView] = useState<DataView>('uptime');
    const [granularity, setGranularity] = useState<Granularity>('hourly');
    const [selectedRangeIndex, setSelectedRangeIndex] = useState(1); // Default to 24h

    // Drilldown state
    const [drilldownHour, setDrilldownHour] = useState<string | null>(null);
    const [drilldownRecords, setDrilldownRecords] = useState<UptimeRecord[]>([]);
    const [isDrilldownLoading, setIsDrilldownLoading] = useState(false);

    // Get current range config
    const currentRange = TIME_RANGES[selectedRangeIndex];

    // Check if minutely data is available for current range (or if in drilldown mode)
    const minutelyAvailable = currentRange.hasMinutelyData || drilldownHour !== null;

    // Fetch drilldown data for a specific hour
    const fetchDrilldown = useCallback(async (hourKey: string) => {
        setIsDrilldownLoading(true);
        setDrilldownHour(hourKey);
        setGranularity('minutely'); // Auto-switch to minutely view

        try {
            const res = await fetch(`/api/servers/${serverId}/uptime?hour=${hourKey}`);
            if (!res.ok) throw new Error('Failed to fetch drilldown');

            const data = await res.json();
            setDrilldownRecords(data.records || []);
        } catch (error: any) {
            console.error('Failed to fetch drilldown data:', error);
            setDrilldownRecords([]);
        } finally {
            setIsDrilldownLoading(false);
        }
    }, [serverId]);

    // Exit drilldown mode
    const exitDrilldown = useCallback(() => {
        setDrilldownHour(null);
        setDrilldownRecords([]);
        setGranularity('hourly');
    }, []);

    // Fetch data when serverId or time range changes
    useEffect(() => {
        // Reset drilldown when range changes
        exitDrilldown();

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/servers/${serverId}/uptime?days=${currentRange.days}`);
                if (!res.ok) throw new Error('Failed to fetch');

                const data: ApiResponse = await res.json();
                let fetchedRecords = data.records || [];

                // For 1h view, filter to last hour only (API returns full day)
                if (currentRange.hours === 1) {
                    const oneHourAgo = Date.now() - 60 * 60 * 1000;
                    fetchedRecords = fetchedRecords.filter((r: any) => {
                        const date = parseDate(r.checkedAt);
                        return date.getTime() >= oneHourAgo;
                    });
                }

                setRecords(fetchedRecords);
                setIsAggregated(data.aggregated || false);
            } catch (error: any) {
                console.error('Failed to fetch uptime data:', error);
                setRecords([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [serverId, currentRange.days, currentRange.hours, exitDrilldown]);

    // Auto-switch to hourly if minutely not available
    useEffect(() => {
        if (!minutelyAvailable && granularity === 'minutely') {
            setGranularity('hourly');
        }
    }, [minutelyAvailable, granularity]);

    // Calculate overall stats
    const stats = useMemo(() => {
        if (records.length === 0) {
            return { uptimePercentage: 0, avgResponseTime: 0, avgPlayers: 0, peakPlayers: 0 };
        }

        let totalChecks = 0;
        let onlineChecks = 0;
        let responseTimes: number[] = [];
        let playerCounts: number[] = [];

        records.forEach((r: any) => {
            if (isAggregated && r._aggregated) {
                totalChecks += r._totalChecks || 1;
                onlineChecks += r._onlineCount || 0;
            } else {
                totalChecks++;
                if (r.online) onlineChecks++;
            }
            if (r.responseTimeMs) responseTimes.push(r.responseTimeMs);
            if (r.playersOnline != null) playerCounts.push(r.playersOnline);
        });

        return {
            uptimePercentage: totalChecks > 0 ? (onlineChecks / totalChecks) * 100 : 0,
            avgResponseTime: responseTimes.length > 0
                ? Math.round(responseTimes.reduce((a: any, b: any) => Number(a) + Number(b), 0) / responseTimes.length)
                : 0,
            avgPlayers: playerCounts.length > 0
                ? Math.round(playerCounts.reduce((a: any, b: any) => Number(a) + Number(b), 0) / playerCounts.length)
                : 0,
            peakPlayers: playerCounts.length > 0 ? Math.max(...playerCounts.map(Number)) : 0,
        };
    }, [records, isAggregated]);

    // Build chart data based on granularity
    const chartData = useMemo((): ChartDataPoint[] => {
        // Use drilldown records if in drilldown mode
        const sourceRecords = drilldownHour ? drilldownRecords : records;
        if (sourceRecords.length === 0) return [];

        // Sort records by time (oldest first)
        const sorted = [...sourceRecords].sort((a: any, b: any) => {
            const dateA = parseDate(a.checkedAt);
            const dateB = parseDate(b.checkedAt);
            return dateA.getTime() - dateB.getTime();
        });

        // =================================================================
        // MINUTELY VIEW (or drilldown mode)
        // =================================================================
        if ((granularity === 'minutely' && minutelyAvailable) || drilldownHour) {
            // For minutely view, we need raw (non-aggregated) data
            const limit = drilldownHour ? 60 : currentRange.maxMinutelyBars;
            const sliced = sorted.slice(-limit);

            return sliced.map((record: any) => {
                const date = parseDate(record.checkedAt);
                return {
                    label: formatLabel(date, 'minutely', currentRange.hours),
                    fullTime: date.toLocaleString(),
                    online: record.online ? 1 : 0,
                    offline: record.online ? 0 : 1,
                    uptimePercent: record.online ? 100 : 0,
                    players: record.playersOnline || 0,
                    avgPlayers: record.playersOnline || 0,
                    maxSlots: record.playersMax || 0,
                    isOnline: record.online,
                };
            });
        }

        // =================================================================
        // HOURLY VIEW
        // =================================================================
        if (isAggregated) {
            // API returned pre-aggregated hourly data (for 7d+ ranges)
            // Use it directly
            const limit = currentRange.maxHourlyBars;
            const sliced = sorted.slice(-limit);

            return sliced.map((record: any) => {
                const date = parseDate(record.checkedAt);
                // Create hourKey for drilldown
                const hourKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}`;
                return {
                    label: formatLabel(date, 'hourly', currentRange.hours),
                    fullTime: date.toLocaleString(),
                    online: record._onlineCount || (record.online ? 1 : 0),
                    offline: record._offlineCount || (record.online ? 0 : 1),
                    uptimePercent: record._uptimePercent ?? (record.online ? 100 : 0),
                    players: record.playersOnline || 0,
                    avgPlayers: record.playersOnline || 0,
                    maxSlots: record.playersMax || 0,
                    isOnline: record.online,
                    hourKey, // For drilldown click
                };
            });
        } else {
            // API returned raw minutely data (for 1h/24h ranges)
            // Aggregate on the frontend by hour
            const hourlyMap = new Map<string, {
                online: number;
                offline: number;
                players: number[];
                maxSlots: number;
                date: Date;
            }>();

            sorted.forEach((record: any) => {
                const date = parseDate(record.checkedAt);
                // Create hour key: YYYY-MM-DDTHH
                const hourKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}`;

                if (!hourlyMap.has(hourKey)) {
                    hourlyMap.set(hourKey, {
                        online: 0,
                        offline: 0,
                        players: [],
                        maxSlots: 0,
                        date: new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()),
                    });
                }

                const bucket = hourlyMap.get(hourKey)!;
                if (record.online) {
                    bucket.online++;
                } else {
                    bucket.offline++;
                }
                if (record.playersOnline != null) {
                    bucket.players.push(record.playersOnline);
                }
                if (record.playersMax) {
                    bucket.maxSlots = Math.max(bucket.maxSlots, record.playersMax);
                }
            });

            // Convert to chart data array
            const result: ChartDataPoint[] = [];
            const sortedKeys = Array.from(hourlyMap.keys()).sort();

            sortedKeys.forEach((key: any) => {
                const bucket = hourlyMap.get(key)!;
                const total = bucket.online + bucket.offline;
                const avgPlayers = bucket.players.length > 0
                    ? Math.round(bucket.players.reduce((a: any, b: any) => Number(a) + Number(b), 0) / bucket.players.length)
                    : 0;

                result.push({
                    label: formatLabel(bucket.date, 'hourly', currentRange.hours),
                    fullTime: bucket.date.toLocaleString(),
                    online: bucket.online,
                    offline: bucket.offline,
                    uptimePercent: total > 0 ? (bucket.online / total) * 100 : 0,
                    players: avgPlayers,
                    avgPlayers: avgPlayers,
                    maxSlots: bucket.maxSlots,
                    isOnline: bucket.online > bucket.offline,
                    hourKey: key, // For drilldown click
                });
            });

            // Limit to max hourly bars
            return result.slice(-currentRange.maxHourlyBars);
        }
    }, [records, granularity, minutelyAvailable, isAggregated, currentRange, drilldownHour, drilldownRecords]);

    // Get bar color based on uptime
    const getBarColor = (entry: ChartDataPoint): string => {
        if (granularity === 'minutely') {
            return entry.isOnline ? '#22c55e' : '#ef4444';
        }
        if (entry.uptimePercent >= 100) return '#22c55e';
        if (entry.uptimePercent >= 50) return '#eab308';
        return '#ef4444';
    };

    // Get uptime color class
    const getUptimeColorClass = (percentage: number): string => {
        if (percentage >= 99) return 'text-success';
        if (percentage >= 95) return 'text-neon-cyan';
        if (percentage >= 90) return 'text-warning';
        return 'text-error';
    };

    // =============================================================================
    // RENDER
    // =============================================================================

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
                                onClick={() => minutelyAvailable && setGranularity('minutely')}
                                disabled={!minutelyAvailable}
                                className={`px-3 py-1 rounded text-xs font-medium transition-all ${granularity === 'minutely' && minutelyAvailable
                                    ? 'bg-neon-cyan text-white'
                                    : minutelyAvailable
                                        ? 'text-muted-foreground hover:text-foreground'
                                        : 'text-muted-foreground/50 cursor-not-allowed'
                                    }`}
                                title={!minutelyAvailable ? 'Minutely data not available for ranges > 24h' : ''}
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
                            {TIME_RANGES.map((range: any, index: any) => (
                                <button
                                    key={range.label}
                                    onClick={() => setSelectedRangeIndex(index)}
                                    className={`px-2 py-0.5 rounded-full text-xs transition ${selectedRangeIndex === index
                                        ? 'bg-primary text-primary-foreground shadow'
                                        : 'text-muted-foreground hover:bg-muted/40'
                                        }`}
                                >
                                    {range.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Drilldown Banner */}
                {drilldownHour && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={exitDrilldown}
                            className="h-7 px-2"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Back
                        </Button>
                        <span className="text-sm text-neon-cyan">
                            <ZoomIn className="w-3 h-3 inline mr-1" />
                            Viewing minutely data for: {new Date(drilldownHour + ':00:00').toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                        {isDrilldownLoading && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
                    </div>
                )}

                {/* Stats Row */}
                <div className="grid grid-cols-4 gap-3">
                    <div className="text-center p-3 rounded-lg bg-secondary/30">
                        <p className={`text-lg font-bold ${getUptimeColorClass(stats.uptimePercentage)}`}>
                            {stats.uptimePercentage.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">Uptime</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-secondary/30">
                        <p className="text-lg font-bold text-neon-cyan">{stats.avgResponseTime}ms</p>
                        <p className="text-xs text-muted-foreground">Avg Ping</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-secondary/30">
                        <p className="text-lg font-bold text-neon-purple">{stats.avgPlayers}</p>
                        <p className="text-xs text-muted-foreground">Avg Players</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-secondary/30">
                        <p className="text-lg font-bold text-warning">{stats.peakPlayers}</p>
                        <p className="text-xs text-muted-foreground">Peak Players</p>
                    </div>
                </div>

                {/* Chart */}
                <div className="h-48">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={chartData}
                                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                                onClick={(data: any) => {
                                    // Only allow drilldown in hourly mode (not already in drilldown)
                                    if (granularity === 'hourly' && !drilldownHour && data?.activePayload?.[0]?.payload?.hourKey) {
                                        fetchDrilldown(data.activePayload[0].payload.hourKey);
                                    }
                                }}
                                style={{ cursor: granularity === 'hourly' && !drilldownHour ? 'pointer' : 'default' }}
                            >
                                <defs>
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
                                    content={<CustomTooltip dataView={dataView} granularity={granularity} />}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                {dataView === 'uptime' ? (
                                    <Bar dataKey="uptimePercent" radius={[4, 4, 0, 0]} maxBarSize={30}>
                                        {chartData.map((entry: any, index: any) => (
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

                {/* Legend and Info */}
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
                    <span>
                        {chartData.length} {drilldownHour ? 'minutes' : (granularity === 'hourly' ? 'hours' : 'data points')}
                    </span>
                    {granularity === 'hourly' && !drilldownHour && (
                        <>
                            <span>|</span>
                            <span className="flex items-center gap-1 text-neon-cyan">
                                <ZoomIn className="w-3 h-3" />
                                Click bar to drill down
                            </span>
                        </>
                    )}
                    {!minutelyAvailable && !drilldownHour && (
                        <>
                            <span>|</span>
                            <span className="flex items-center gap-1 text-neon-orange">
                                <AlertCircle className="w-3 h-3" />
                                Minutely N/A for {currentRange.label}
                            </span>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export default ServerUptimeGraph;
