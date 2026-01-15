'use client';

import { useState, useCallback } from 'react';
import { Search, Loader2, Users, Wifi, WifiOff, Clock, Server, Globe, Gamepad2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface LookupResult {
    query: {
        server: string;
        host: string;
        port: number;
        type: string;
    };
    online: boolean;
    queryTime: number;
    cachedAt: string | null;
    players?: {
        online: number;
        max: number;
        list: Array<{ name: string; uuid?: string }>;
    };
    version?: string;
    motd?: {
        raw: string | null;
        clean: string | null;
    };
    icon?: string | null;
    error?: string;
}

type GameType = 'minecraft' | 'minecraft_bedrock' | 'hytale';

export default function LookupPage() {
    const [serverInput, setServerInput] = useState('');
    const [gameType, setGameType] = useState<GameType>('minecraft');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<LookupResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleLookup = useCallback(async () => {
        if (!serverInput.trim()) {
            setError('Please enter a server address');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const params = new URLSearchParams({
                server: serverInput.trim(),
                type: gameType,
            });

            const response = await fetch(`/api/lookup?${params}`);
            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to lookup server');
                return;
            }

            setResult(data);
        } catch (err: any) {
            setError(err.message || 'Failed to connect to server');
        } finally {
            setLoading(false);
        }
    }, [serverInput, gameType]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !loading) {
            handleLookup();
        }
    };

    const gameTypeLabels: Record<GameType, { label: string; icon: string }> = {
        minecraft: { label: 'Java Edition', icon: '☕' },
        minecraft_bedrock: { label: 'Bedrock Edition', icon: '🪨' },
        hytale: { label: 'Hytale', icon: '🎮' },
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-background/50 py-8 px-4">
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-neon-cyan to-neon-purple bg-clip-text text-transparent">
                        Server Lookup
                    </h1>
                    <p className="text-muted-foreground">
                        Check the status of any Minecraft or Hytale server
                    </p>
                </div>

                {/* Search Card */}
                <Card className="border-neon-cyan/20 bg-card/50 backdrop-blur">
                    <CardContent className="pt-6 space-y-4">
                        {/* Game Type Selection */}
                        <div className="flex gap-2 justify-center flex-wrap">
                            {(Object.keys(gameTypeLabels) as GameType[]).map((type) => (
                                <Button
                                    key={type}
                                    variant={gameType === type ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setGameType(type)}
                                    className={gameType === type
                                        ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan hover:bg-neon-cyan/30'
                                        : 'hover:border-neon-cyan/50'
                                    }
                                >
                                    <span className="mr-1">{gameTypeLabels[type].icon}</span>
                                    {gameTypeLabels[type].label}
                                </Button>
                            ))}
                        </div>

                        {/* Server Input */}
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Server className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Enter server address (e.g., hypixel.net or play.server.com:25565)"
                                    value={serverInput}
                                    onChange={(e) => setServerInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="pl-10 bg-background/50 border-muted-foreground/20 focus:border-neon-cyan"
                                    disabled={loading}
                                />
                            </div>
                            <Button
                                onClick={handleLookup}
                                disabled={loading || !serverInput.trim()}
                                className="bg-neon-cyan hover:bg-neon-cyan/80 text-black font-semibold"
                            >
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Search className="h-4 w-4" />
                                )}
                            </Button>
                        </div>

                        {/* Error Display */}
                        {error && (
                            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                                {error}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Result Card */}
                {result && (
                    <Card className={`border-2 transition-all ${result.online
                            ? 'border-green-500/30 bg-green-500/5'
                            : 'border-red-500/30 bg-red-500/5'
                        }`}>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {/* Server Icon */}
                                    {result.icon ? (
                                        <img
                                            src={result.icon}
                                            alt="Server icon"
                                            className="w-16 h-16 rounded-lg border border-border"
                                        />
                                    ) : (
                                        <div className="w-16 h-16 rounded-lg border border-border bg-muted flex items-center justify-center">
                                            <Gamepad2 className="h-8 w-8 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div>
                                        <CardTitle className="text-xl">{result.query.host}</CardTitle>
                                        <CardDescription className="flex items-center gap-2">
                                            <Globe className="h-3 w-3" />
                                            {result.query.server}
                                            <Badge variant="outline" className="text-xs">
                                                {gameTypeLabels[result.query.type as GameType]?.label || result.query.type}
                                            </Badge>
                                        </CardDescription>
                                    </div>
                                </div>
                                <Badge
                                    variant={result.online ? 'default' : 'destructive'}
                                    className={`text-sm px-3 py-1 ${result.online
                                            ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                            : 'bg-red-500/20 text-red-400 border-red-500/30'
                                        }`}
                                >
                                    {result.online ? (
                                        <><Wifi className="h-3 w-3 mr-1" /> Online</>
                                    ) : (
                                        <><WifiOff className="h-3 w-3 mr-1" /> Offline</>
                                    )}
                                </Badge>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            {result.online ? (
                                <>
                                    {/* MOTD */}
                                    {result.motd?.clean && (
                                        <div className="p-3 rounded-lg bg-background/50 border border-border font-mono text-sm whitespace-pre-wrap">
                                            {result.motd.clean}
                                        </div>
                                    )}

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-3 rounded-lg bg-background/50 border border-border text-center">
                                            <Users className="h-5 w-5 mx-auto mb-1 text-neon-cyan" />
                                            <div className="text-lg font-bold">
                                                {result.players?.online || 0}/{result.players?.max || 0}
                                            </div>
                                            <div className="text-xs text-muted-foreground">Players</div>
                                        </div>
                                        <div className="p-3 rounded-lg bg-background/50 border border-border text-center">
                                            <Server className="h-5 w-5 mx-auto mb-1 text-neon-purple" />
                                            <div className="text-lg font-bold truncate" title={result.version || 'Unknown'}>
                                                {result.version || 'Unknown'}
                                            </div>
                                            <div className="text-xs text-muted-foreground">Version</div>
                                        </div>
                                        <div className="p-3 rounded-lg bg-background/50 border border-border text-center">
                                            <Clock className="h-5 w-5 mx-auto mb-1 text-neon-orange" />
                                            <div className="text-lg font-bold">
                                                {result.queryTime}ms
                                            </div>
                                            <div className="text-xs text-muted-foreground">Response</div>
                                        </div>
                                    </div>

                                    {/* Player List */}
                                    {result.players?.list && result.players.list.length > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="text-sm font-semibold text-muted-foreground">
                                                Online Players ({result.players.list.length})
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {result.players.list.slice(0, 20).map((player, i) => (
                                                    <Badge key={i} variant="secondary" className="text-xs">
                                                        {player.name}
                                                    </Badge>
                                                ))}
                                                {result.players.list.length > 20 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        +{result.players.list.length - 20} more
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-4 text-muted-foreground">
                                    <WifiOff className="h-12 w-12 mx-auto mb-2 text-red-400" />
                                    <p>{result.error || 'Server is offline or unreachable'}</p>
                                    <p className="text-xs mt-1">Query time: {result.queryTime}ms</p>
                                </div>
                            )}

                            {/* Cache Info */}
                            {result.cachedAt && (
                                <p className="text-xs text-muted-foreground text-right">
                                    Cached at {new Date(result.cachedAt).toLocaleTimeString()}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* API Usage Info */}
                <Card className="border-muted bg-card/30">
                    <CardContent className="pt-4">
                        <h3 className="text-sm font-semibold mb-2">API Usage</h3>
                        <p className="text-xs text-muted-foreground mb-2">
                            You can also query servers programmatically:
                        </p>
                        <code className="block p-2 rounded bg-background/50 text-xs font-mono text-neon-cyan break-all">
                            GET /api/lookup?server=hypixel.net&type=minecraft
                        </code>
                        <p className="text-xs text-muted-foreground mt-2">
                            Rate limit: 10 requests per minute
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
