'use client';

import { useState, useEffect } from 'react';
import {
    Activity, Server, Clock, TrendingUp, TrendingDown,
    Loader2, ChevronDown, RefreshCw, Wifi, WifiOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ServerInfo {
    id: number;
    name: string;
    address: string;
}

interface UptimeStat {
    serverId: number;
    uptimePercentage: number;
    avgResponseTime: number;
    totalChecks: number;
    onlineChecks: number;
}

interface ChartDataPoint {
    timestamp: string;
    online: number;
    offline: number;
}

interface UptimeRecord {
    id: number;
    serverId: number;
    online: boolean;
    playersOnline: number | null;
    responseTimeMs: number | null;
    checkedAt: Date;
}

export default function AdminUptimePage() {
    const [servers, setServers] = useState<ServerInfo[]>([]);
    const [uptimeStats, setUptimeStats] = useState<UptimeStat[]>([]);
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [records, setRecords] = useState<UptimeRecord[]>([]);
    const [selectedServer, setSelectedServer] = useState<string>('all');
    const [selectedDays, setSelectedDays] = useState<number>(7);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showServerDropdown, setShowServerDropdown] = useState(false);

    useEffect(() => {
        fetchUptimeData();
    }, [selectedServer, selectedDays]);

    const fetchUptimeData = async () => {
        try {
            const params = new URLSearchParams({
                days: selectedDays.toString(),
            });
            if (selectedServer !== 'all') {
                params.set('serverId', selectedServer);
            }

            const res = await fetch(`/api/admin/uptime?${params}`);
            if (res.ok) {
                const data = await res.json();
                setServers(data.servers || []);
                setUptimeStats(data.uptimeStats || []);
                setChartData(data.chartData || []);
                setRecords(data.records || []);
            }
        } catch (error) {
            console.error('Failed to fetch uptime data:', error);
            toast.error('Failed to load uptime data');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchUptimeData();
    };

    const triggerManualCheck = async () => {
        try {
            const res = await fetch('/api/cron/uptime', {
                headers: {
                    'x-cron-secret': 'vonix-cron-secret',
                },
            });
            if (res.ok) {
                const data = await res.json();
                toast.success(`Checked ${data.checked} servers: ${data.online} online, ${data.offline} offline`);
                fetchUptimeData();
            } else {
                toast.error('Failed to check servers');
            }
        } catch (error) {
            toast.error('Failed to trigger server check');
        }
    };

    const getUptimeColor = (percentage: number) => {
        if (percentage >= 99) return 'text-success';
        if (percentage >= 95) return 'text-neon-cyan';
        if (percentage >= 90) return 'text-warning';
        return 'text-error';
    };

    const getUptimeBadge = (percentage: number) => {
        if (percentage >= 99) return 'success';
        if (percentage >= 95) return 'neon-cyan';
        if (percentage >= 90) return 'warning';
        return 'error';
    };

    const overallUptime = uptimeStats.length > 0
        ? uptimeStats.reduce((sum, s) => sum + s.uptimePercentage, 0) / uptimeStats.length
        : 0;

    const avgResponseTime = uptimeStats.length > 0
        ? uptimeStats.reduce((sum, s) => sum + s.avgResponseTime, 0) / uptimeStats.length
        : 0;

    const totalChecks = uptimeStats.reduce((sum, s) => sum + s.totalChecks, 0);
    const maxChartValue = Math.max(...chartData.map(d => d.online + d.offline), 1);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold gradient-text mb-2">Server Uptime</h1>
                    <p className="text-muted-foreground">
                        Monitor server uptime and performance (pings every 60 seconds, stores 90 days)
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="neon-outline" onClick={triggerManualCheck}>
                        <Activity className="w-4 h-4 mr-2" />
                        Check Now
                    </Button>
                    <Button variant="ghost" onClick={handleRefresh} disabled={isRefreshing}>
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
                <div className="relative">
                    <Button
                        variant="glass"
                        onClick={() => setShowServerDropdown(!showServerDropdown)}
                        className="min-w-[200px] justify-between"
                    >
                        <span className="flex items-center gap-2">
                            <Server className="w-4 h-4" />
                            {selectedServer === 'all'
                                ? 'All Servers'
                                : servers.find(s => s.id.toString() === selectedServer)?.name || 'Select Server'
                            }
                        </span>
                        <ChevronDown className="w-4 h-4" />
                    </Button>

                    {showServerDropdown && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowServerDropdown(false)} />
                            <div className="absolute top-full left-0 mt-2 w-full bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                                <button
                                    onClick={() => { setSelectedServer('all'); setShowServerDropdown(false); }}
                                    className={`w-full px-4 py-2 text-left hover:bg-secondary ${selectedServer === 'all' ? 'bg-secondary' : ''}`}
                                >
                                    All Servers
                                </button>
                                {servers.map(server => (
                                    <button
                                        key={server.id}
                                        onClick={() => { setSelectedServer(server.id.toString()); setShowServerDropdown(false); }}
                                        className={`w-full px-4 py-2 text-left hover:bg-secondary ${selectedServer === server.id.toString() ? 'bg-secondary' : ''}`}
                                    >
                                        {server.name}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-1">
                    {[
                        { label: '24h', days: 1 },
                        { label: '7d', days: 7 },
                        { label: '30d', days: 30 },
                        { label: '90d', days: 90 },
                    ].map(option => (
                        <button
                            key={option.days}
                            onClick={() => setSelectedDays(option.days)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${selectedDays === option.days
                                ? 'bg-neon-cyan text-white'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card variant="glass">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Overall Uptime</p>
                                <p className={`text-2xl font-bold ${getUptimeColor(overallUptime)}`}>
                                    {overallUptime.toFixed(2)}%
                                </p>
                            </div>
                            <div className={`p-2 rounded-lg ${overallUptime >= 95 ? 'bg-success/20' : 'bg-error/20'}`}>
                                {overallUptime >= 95 ? (
                                    <TrendingUp className="w-5 h-5 text-success" />
                                ) : (
                                    <TrendingDown className="w-5 h-5 text-error" />
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card variant="glass">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Avg Response</p>
                                <p className="text-2xl font-bold text-neon-cyan">{Math.round(avgResponseTime)}ms</p>
                            </div>
                            <div className="p-2 rounded-lg bg-neon-cyan/20">
                                <Clock className="w-5 h-5 text-neon-cyan" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card variant="glass">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Checks</p>
                                <p className="text-2xl font-bold text-neon-purple">{totalChecks.toLocaleString()}</p>
                            </div>
                            <div className="p-2 rounded-lg bg-neon-purple/20">
                                <Activity className="w-5 h-5 text-neon-purple" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card variant="glass">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Servers</p>
                                <p className="text-2xl font-bold text-neon-orange">{servers.length}</p>
                            </div>
                            <div className="p-2 rounded-lg bg-neon-orange/20">
                                <Server className="w-5 h-5 text-neon-orange" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Uptime Chart */}
            <Card variant="glass">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-neon-cyan" />
                        Uptime History
                    </CardTitle>
                    <CardDescription>
                        Server status checks over the last {selectedDays} day{selectedDays > 1 ? 's' : ''}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {chartData.length > 0 ? (
                        <div className="h-64 flex items-end gap-px overflow-x-auto">
                            {chartData.map((point, index) => {
                                const total = point.online + point.offline;
                                const onlineHeight = total > 0 ? (point.online / maxChartValue) * 100 : 0;
                                const offlineHeight = total > 0 ? (point.offline / maxChartValue) * 100 : 0;

                                return (
                                    <div
                                        key={index}
                                        className="flex-1 flex flex-col justify-end gap-0.5 group relative"
                                        style={{ minWidth: chartData.length > 100 ? '2px' : '4px' }}
                                    >
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                            <div className="bg-card border border-border rounded-lg p-2 text-xs whitespace-nowrap shadow-lg">
                                                <p className="font-medium">{new Date(point.timestamp).toLocaleString()}</p>
                                                <p className="text-success">Online: {point.online}</p>
                                                <p className="text-error">Offline: {point.offline}</p>
                                            </div>
                                        </div>

                                        <div
                                            className="bg-error/70 rounded-t-sm transition-all"
                                            style={{ height: `${offlineHeight}%` }}
                                        />
                                        <div
                                            className="bg-success/70 rounded-t-sm transition-all"
                                            style={{ height: `${onlineHeight}%` }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="h-64 flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>No uptime data available</p>
                                <Button variant="neon" className="mt-4" onClick={triggerManualCheck}>
                                    Run First Check
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm bg-success/70" />
                            <span className="text-muted-foreground">Online</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm bg-error/70" />
                            <span className="text-muted-foreground">Offline</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Server Stats */}
            <Card variant="glass">
                <CardHeader>
                    <CardTitle>Server Status</CardTitle>
                    <CardDescription>Individual server uptime statistics</CardDescription>
                </CardHeader>
                <CardContent>
                    {uptimeStats.length > 0 ? (
                        <div className="space-y-4">
                            {uptimeStats.map(stat => {
                                const server = servers.find(s => s.id === stat.serverId);
                                if (!server) return null;

                                return (
                                    <div
                                        key={stat.serverId}
                                        className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50"
                                    >
                                        <div className="p-2 rounded-lg bg-neon-cyan/20">
                                            <Server className="w-5 h-5 text-neon-cyan" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">{server.name}</span>
                                                <Badge variant={getUptimeBadge(stat.uptimePercentage)}>
                                                    {stat.uptimePercentage.toFixed(1)}% uptime
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">{server.address}</p>
                                        </div>

                                        <div className="text-right">
                                            <p className="text-sm font-medium">{stat.avgResponseTime}ms avg</p>
                                            <p className="text-xs text-muted-foreground">
                                                {stat.onlineChecks}/{stat.totalChecks} checks
                                            </p>
                                        </div>

                                        <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${stat.uptimePercentage >= 95 ? 'bg-success' : stat.uptimePercentage >= 90 ? 'bg-warning' : 'bg-error'}`}
                                                style={{ width: `${stat.uptimePercentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <Server className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No server statistics available</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Recent Checks */}
            <Card variant="glass">
                <CardHeader>
                    <CardTitle>Recent Checks</CardTitle>
                    <CardDescription>Last 20 server status checks</CardDescription>
                </CardHeader>
                <CardContent>
                    {records.length > 0 ? (
                        <div className="space-y-2">
                            {records.slice(0, 20).map(record => {
                                const server = servers.find(s => s.id === record.serverId);
                                return (
                                    <div
                                        key={record.id}
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/30"
                                    >
                                        {record.online ? (
                                            <Wifi className="w-4 h-4 text-success" />
                                        ) : (
                                            <WifiOff className="w-4 h-4 text-error" />
                                        )}
                                        <span className="font-medium flex-1">{server?.name || `Server ${record.serverId}`}</span>
                                        {record.playersOnline !== null && (
                                            <span className="text-sm text-muted-foreground">{record.playersOnline} players</span>
                                        )}
                                        {record.responseTimeMs && (
                                            <span className="text-sm text-muted-foreground">{record.responseTimeMs}ms</span>
                                        )}
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(record.checkedAt).toLocaleTimeString()}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No check records available</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Setup Instructions */}
            {chartData.length === 0 && (
                <Card variant="glass">
                    <CardHeader>
                        <CardTitle>Setup Server Uptime Monitoring</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-muted-foreground">
                            To enable automatic uptime monitoring, set up a cron job to call the uptime endpoint every 60 seconds:
                        </p>
                        <div className="p-4 rounded-lg bg-secondary/50">
                            <code className="text-sm break-all">
                                GET {typeof window !== 'undefined' ? window.location.origin : ''}/api/cron/uptime
                            </code>
                            <p className="text-xs text-muted-foreground mt-2">
                                Include header: <code>x-cron-secret: vonix-cron-secret</code>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
