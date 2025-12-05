"use client";

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import {
  Server, Users, Wifi, WifiOff, Copy, Check,
  ExternalLink, Map, RefreshCw, Loader2, Globe
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

interface ServerData {
  id: number;
  name: string;
  description: string | null;
  ipAddress: string;
  port: number;
  hidePort?: boolean;
  modpackName: string | null;
  bluemapUrl: string | null;
  curseforgeUrl: string | null;
  online: boolean;
  version: string | null;
  players: {
    online: number;
    max: number;
    list?: Array<{ name: string; uuid: string }>;
  };
  motd: string;
  icon: string | null;
  // New: loading state for individual servers
  isLoading?: boolean;
}

interface ServerStatusProps {
  variant?: 'full' | 'compact' | 'mini' | 'accordion' | 'carousel';
  showRefresh?: boolean;
  className?: string;
}

// Skeleton loader for a server card
function ServerCardSkeleton({ variant = 'full' }: { variant?: string }) {
  if (variant === 'mini') {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
          <div className="h-4 w-24 bg-muted-foreground/20 rounded" />
        </div>
        <div className="h-4 w-12 bg-muted-foreground/20 rounded" />
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-muted-foreground/20" />
          <div className="space-y-2">
            <div className="h-4 w-32 bg-muted-foreground/20 rounded" />
            <div className="h-3 w-24 bg-muted-foreground/20 rounded" />
          </div>
        </div>
        <div className="h-8 w-16 bg-muted-foreground/20 rounded" />
      </div>
    );
  }

  return (
    <Card variant="glass" className="overflow-hidden animate-pulse">
      <div className="h-1 bg-muted-foreground/20" />
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-muted-foreground/20" />
            <div className="space-y-2">
              <div className="h-5 w-32 bg-muted-foreground/20 rounded" />
              <div className="h-3 w-20 bg-muted-foreground/20 rounded" />
            </div>
          </div>
          <div className="h-6 w-16 bg-muted-foreground/20 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-4 w-full bg-muted-foreground/20 rounded" />
        <div className="p-3 rounded-lg bg-secondary/50">
          <div className="h-6 w-24 bg-muted-foreground/20 rounded mx-auto" />
        </div>
        <div className="p-3 rounded-lg bg-secondary/50">
          <div className="h-4 w-32 bg-muted-foreground/20 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

// Loading indicator for status
function StatusLoadingIndicator() {
  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
      <Loader2 className="h-3.5 w-3.5 text-neon-cyan animate-spin" />
      <span className="text-sm font-medium text-neon-cyan">Loading...</span>
    </div>
  );
}

export function ServerStatusList({
  variant = 'full',
  showRefresh = true,
  className
}: ServerStatusProps) {
  const [servers, setServers] = useState<ServerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const fetchServers = useCallback(async (showLoadingState = true) => {
    if (showLoadingState) setIsRefreshing(true);
    try {
      const res = await fetch('/api/servers/status', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setServers(data.servers || []);
        setLastFetched(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch servers:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchServers(false);
    const interval = setInterval(() => fetchServers(false), 60000);
    return () => clearInterval(interval);
  }, [fetchServers]);

  const copyToClipboard = async (ip: string) => {
    try {
      await navigator.clipboard.writeText(ip);
      setCopiedIp(ip);
      setTimeout(() => setCopiedIp(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const totalPlayers = servers.reduce((sum, s) => sum + (s.players?.online || 0), 0);
  const onlineServers = servers.filter((s) => s.online).length;

  const getServerAddress = (server: ServerData) =>
    server.hidePort || server.port === 25565 ? server.ipAddress : `${server.ipAddress}:${server.port}`;

  // Show skeleton loaders during initial load
  if (isLoading) {
    const skeletonCount = variant === 'mini' ? 3 : 2;
    return (
      <div className={cn("space-y-4", className)}>
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <StatusLoadingIndicator />
            <Badge variant="secondary" className="animate-pulse">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Loading Servers...
            </Badge>
          </div>
        </div>

        {/* Content skeletons */}
        {variant === 'full' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <ServerCardSkeleton key={i} variant={variant} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <ServerCardSkeleton key={i} variant={variant} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Carousel variant (one server at a time, with navigation)
  if (variant === 'carousel') {
    const safeIndex = servers.length > 0 ? carouselIndex % servers.length : 0;
    const currentServer = servers[safeIndex];

    const nextServer = () => {
      if (servers.length === 0) return;
      setCarouselIndex((prev) => (prev + 1) % servers.length);
    };

    const prevServer = () => {
      if (servers.length === 0) return;
      setCarouselIndex((prev) => (prev - 1 + servers.length) % servers.length);
    };

    return (
      <Card variant="glass" className={cn('overflow-hidden', className)}>
        <CardContent className="p-6 md:p-8 space-y-6">
          {/* Header with navigation */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <Server className="h-5 w-5 text-neon-cyan" />
                <div>
                  <p className="text-sm text-muted-foreground">Server Status</p>
                  <h3 className="text-2xl font-bold">{currentServer?.name}</h3>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isRefreshing ? (
                <StatusLoadingIndicator />
              ) : (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                  <div
                    className={cn(
                      'h-2.5 w-2.5 rounded-full',
                      currentServer?.online ? 'bg-success animate-pulse' : 'bg-error'
                    )}
                  />
                  <span className="text-sm font-medium">
                    {currentServer?.online ? 'Online' : 'Offline'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {currentServer?.description && (
            <p className="text-sm text-muted-foreground">
              {currentServer.description}
            </p>
          )}

          {/* Stats */}
          <div className="space-y-4 pt-2">
            <div className="flex justify-between items-center p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-neon-cyan" />
                <span className="text-sm">Players Online</span>
              </div>
              <span className="text-xl font-bold gradient-text">
                {currentServer?.online
                  ? `${currentServer.players?.online || 0}/${currentServer.players?.max || 0}`
                  : '0/0'}
              </span>
            </div>

            {currentServer?.version && (
              <div className="flex justify-between items-center p-4 rounded-lg bg-secondary/50">
                <span className="text-sm">Version</span>
                <span className="text-xl font-bold gradient-text">{currentServer.version}</span>
              </div>
            )}

            {currentServer?.modpackName && (
              <div className="flex justify-between items-center p-4 rounded-lg bg-secondary/50">
                <span className="text-sm">Modpack</span>
                <span className="text-lg font-semibold gradient-text">{currentServer.modpackName}</span>
              </div>
            )}
          </div>

          {/* IP */}
          <div className="pt-2 space-y-2">
            <p className="text-sm text-muted-foreground">Server IP</p>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 border border-white/10">
              <Globe className="h-4 w-4 text-neon-cyan" />
              <code className="text-neon-cyan font-mono">
                {currentServer && getServerAddress(currentServer)}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => currentServer && copyToClipboard(getServerAddress(currentServer))}
              >
                {currentServer && copiedIp === getServerAddress(currentServer) ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Navigation */}
          {servers.length > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={prevServer}
                className="gap-1"
              >
                <span className="text-xs">Prev</span>
              </Button>

              <div className="flex items-center gap-2">
                {servers.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCarouselIndex(index)}
                    className={cn(
                      'h-2 rounded-full transition-all',
                      index === safeIndex
                        ? 'w-8 bg-neon-cyan'
                        : 'w-2 bg-white/20 hover:bg-white/40'
                    )}
                    aria-label={`Go to server ${index + 1}`}
                  />
                ))}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={nextServer}
                className="gap-1"
              >
                <span className="text-xs">Next</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (servers.length === 0) {
    return (
      <Card variant="glass" className={cn("text-center py-12", className)}>
        <CardContent>
          <Server className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-xl font-bold mb-2">No Servers Available</h3>
          <p className="text-muted-foreground">Check back later for server information</p>
        </CardContent>
      </Card>
    );
  }

  // Accordion variant
  if (variant === 'accordion') {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Badge variant="neon-cyan" className="px-3 py-1">
              <Users className="w-3 h-3 mr-1" />
              {totalPlayers} Online
            </Badge>
            <Badge variant={onlineServers > 0 ? 'success' : 'error'}>
              {onlineServers}/{servers.length} Servers
            </Badge>
          </div>
          {showRefresh && (
            <Button variant="ghost" size="sm" onClick={() => fetchServers(true)} disabled={isRefreshing}>
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            </Button>
          )}
        </div>

        <Accordion type="single" defaultValue={servers[0]?.id.toString()}>
          {servers.map((server) => (
            <AccordionItem key={server.id} value={server.id.toString()}>
              <AccordionTrigger>
                <div className="flex items-center gap-3 flex-1">
                  <div className={cn("w-3 h-3 rounded-full flex-shrink-0", server.online ? "bg-success animate-pulse" : "bg-error")} />
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{server.name}</span>
                      {server.modpackName && <Badge variant="neon-purple" className="text-xs">{server.modpackName}</Badge>}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {server.players?.online || 0}/{server.players?.max || 0}
                      </span>
                      {server.version && <span>{server.version}</span>}
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  {server.description && <p className="text-sm text-muted-foreground">{server.description}</p>}
                  {server.motd && <p className="text-sm italic text-muted-foreground border-l-2 border-neon-cyan/50 pl-3">{server.motd}</p>}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-neon-cyan" />
                      <code className="text-sm font-mono text-neon-cyan">{getServerAddress(server)}</code>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(getServerAddress(server))}>
                      {copiedIp === getServerAddress(server) ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {server.bluemapUrl && (
                      <Button variant="neon-outline" size="sm" asChild>
                        <a href={server.bluemapUrl} target="_blank" rel="noopener noreferrer">
                          <Map className="w-4 h-4 mr-1" />Map
                        </a>
                      </Button>
                    )}
                    {server.curseforgeUrl && (
                      <Button variant="neon-outline" size="sm" asChild>
                        <a href={server.curseforgeUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-1" />Modpack
                        </a>
                      </Button>
                    )}
                    <Button variant="neon-outline" size="sm" asChild>
                      <Link href={`/servers/${server.id}`}>View Details</Link>
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    );
  }

  // Mini variant
  if (variant === 'mini') {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant="neon-cyan" className="px-3 py-1">
              <Users className="w-3 h-3 mr-1" />{totalPlayers} Online
            </Badge>
            <Badge variant={onlineServers > 0 ? 'success' : 'error'}>
              {onlineServers}/{servers.length} Servers
            </Badge>
          </div>
          {showRefresh && (
            <Button variant="ghost" size="sm" onClick={() => fetchServers(true)} disabled={isRefreshing}>
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            </Button>
          )}
        </div>
        {servers.slice(0, 3).map((server) => (
          <div key={server.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-3">
              <div className={cn("w-2 h-2 rounded-full", server.online ? "bg-success animate-pulse" : "bg-error")} />
              <span className="font-medium">{server.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-3 h-3" />
              {server.players?.online || 0}/{server.players?.max || 0}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2">
            <Server className="w-5 h-5 text-neon-cyan" />Server Status
          </h3>
          {showRefresh && (
            <Button variant="ghost" size="sm" onClick={() => fetchServers(true)} disabled={isRefreshing}>
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            </Button>
          )}
        </div>
        <div className="grid gap-3">
          {servers.map((server) => (
            <div key={server.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
              <div className="flex items-center gap-4">
                {server.icon ? (
                  <img src={`data:image/png;base64,${server.icon}`} alt={server.name} className="w-10 h-10 rounded" />
                ) : (
                  <div className="w-10 h-10 rounded bg-neon-cyan/20 flex items-center justify-center">
                    <Server className="w-5 h-5 text-neon-cyan" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{server.name}</span>
                    <Badge variant={server.online ? "success" : "error"} className="text-xs">
                      {server.online ? <><Wifi className="w-3 h-3 mr-1" />Online</> : <><WifiOff className="w-3 h-3 mr-1" />Offline</>}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{getServerAddress(server)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-bold text-lg">{server.players?.online || 0}<span className="text-muted-foreground text-sm">/{server.players?.max || 0}</span></p>
                  <p className="text-xs text-muted-foreground">players</p>
                </div>
                <Button variant="neon-outline" size="sm" onClick={() => copyToClipboard(getServerAddress(server))}>
                  {copiedIp === getServerAddress(server) ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Full variant (default)
  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="neon-cyan" className="px-4 py-2 text-base">
            <Users className="w-4 h-4 mr-2" />{totalPlayers} Players Online
          </Badge>
          <Badge variant={onlineServers === servers.length ? 'success' : 'secondary'}>
            {onlineServers}/{servers.length} Servers Online
          </Badge>
        </div>
        {showRefresh && (
          <div className="flex items-center gap-2">
            {lastFetched && <span className="text-xs text-muted-foreground">Updated {lastFetched.toLocaleTimeString()}</span>}
            <Button variant="neon-outline" size="sm" onClick={() => fetchServers(true)} disabled={isRefreshing}>
              <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />Refresh
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {servers.map((server) => (
          <Card key={server.id} variant="glass" hover className="overflow-hidden">
            <div className={cn("h-1", server.online ? "bg-success" : "bg-error")} />
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {server.icon ? (
                    <img src={`data:image/png;base64,${server.icon}`} alt={server.name} className="w-12 h-12 rounded-lg" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center">
                      <Server className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-lg">{server.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{server.version || 'Unknown Version'}</p>
                  </div>
                </div>
                <Badge variant={server.online ? "success" : "error"}>
                  {server.online ? <><Wifi className="w-3 h-3 mr-1" />Online</> : <><WifiOff className="w-3 h-3 mr-1" />Offline</>}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {server.description && <p className="text-sm text-muted-foreground">{server.description}</p>}
              {server.motd && <p className="text-sm italic text-muted-foreground border-l-2 border-neon-cyan/50 pl-3">{server.motd}</p>}

              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-neon-purple" />
                  <span className="text-sm">Players</span>
                </div>
                <span className="text-xl font-bold">
                  {server.players?.online || 0}
                  <span className="text-sm text-muted-foreground">/{server.players?.max || 0}</span>
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <code className="text-sm font-mono">{getServerAddress(server)}</code>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(getServerAddress(server))}>
                  {copiedIp === getServerAddress(server) ? (
                    <><Check className="w-4 h-4 mr-1 text-success" />Copied!</>
                  ) : (
                    <><Copy className="w-4 h-4 mr-1" />Copy IP</>
                  )}
                </Button>
              </div>

              <div className="flex gap-2 flex-wrap">
                {server.modpackName && (
                  <Badge variant="neon-purple" className="flex-1 justify-center py-2">{server.modpackName}</Badge>
                )}
                {server.bluemapUrl && (
                  <Button variant="neon-outline" size="sm" asChild>
                    <a href={server.bluemapUrl} target="_blank" rel="noopener noreferrer">
                      <Map className="w-4 h-4 mr-1" />Map
                    </a>
                  </Button>
                )}
                {server.curseforgeUrl && (
                  <Button variant="neon-outline" size="sm" asChild>
                    <a href={server.curseforgeUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-1" />Modpack
                    </a>
                  </Button>
                )}
                <Button variant="neon-outline" size="sm" asChild>
                  <Link href={`/servers/${server.id}`}>View Details</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Single server status widget
interface SingleServerStatusProps {
  address: string;
  port?: number;
  name?: string;
  className?: string;
}

export function SingleServerStatus({ address, port = 25565, name, className }: SingleServerStatusProps) {
  const [status, setStatus] = useState<{ online: boolean; players: { online: number; max: number }; version?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/servers/status?address=${address}&port=${port}`, {
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          if (data.data) {
            setStatus({
              online: data.data.online,
              players: { online: data.data.players?.online || 0, max: data.data.players?.max || 0 },
              version: data.data.version,
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch status:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, [address, port]);

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Loader2 className="w-4 h-4 animate-spin text-neon-cyan" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!status) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <WifiOff className="w-4 h-4 text-error" />
        <span className="text-sm text-muted-foreground">Unavailable</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className={cn('w-2 h-2 rounded-full', status.online ? 'bg-success animate-pulse' : 'bg-error')} />
      <span className="font-medium">{name || address}</span>
      <span className="text-sm text-muted-foreground">{status.players.online}/{status.players.max}</span>
    </div>
  );
}
