import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Wifi, WifiOff, Map, ArrowLeft, Loader2 } from 'lucide-react';
import { Suspense } from 'react';
import { ServerUptimeGraph } from '@/components/server-uptime-graph';

import { Metadata } from 'next';

interface ServerDetailParams {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ServerDetailParams): Promise<Metadata> {
  const { id } = await params;
  const serverId = Number.parseInt(id, 10);
  if (Number.isNaN(serverId)) return { title: 'Server Not Found' };

  const server = await getServerWithStatus(serverId);
  if (!server) return { title: 'Server Not Found' };

  return {
    title: server.name,
    description: server.description || `Join ${server.name} on Vonix Network. ${server.online ? 'Online now!' : 'Currently offline.'}`,
    openGraph: {
      title: `${server.name} | Vonix Network`,
      description: server.description || `Join ${server.name} on Vonix Network. ${server.online ? 'Online now!' : 'Currently offline.'}`,
    },
  };
}

// Loading skeleton for the server detail page
function ServerDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Button variant="ghost" asChild>
        <a href="/servers" className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Servers
        </a>
      </Button>

      <Card variant="glass" className="animate-pulse">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="h-7 w-48 bg-muted-foreground/20 rounded" />
              <div className="h-4 w-24 bg-muted-foreground/20 rounded" />
              <div className="h-4 w-32 bg-muted-foreground/20 rounded" />
            </div>
            <div className="h-6 w-20 bg-muted-foreground/20 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-4 w-full bg-muted-foreground/20 rounded" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Players list skeleton */}
            <Card variant="glass" className="col-span-1">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div className="h-5 w-32 bg-muted-foreground/20 rounded" />
                <div className="h-5 w-12 bg-muted-foreground/20 rounded" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-neon-cyan" />
                </div>
              </CardContent>
            </Card>

            {/* Map skeleton */}
            <div className="col-span-2 space-y-3">
              <Card variant="glass" className="h-full">
                <CardHeader className="pb-2 flex items-center justify-between">
                  <div className="h-5 w-24 bg-muted-foreground/20 rounded" />
                </CardHeader>
                <CardContent className="h-[480px] flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

async function getServerWithStatus(id: number) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const res = await fetch(`${baseUrl}/api/servers/status`, {
      cache: 'no-store', // Always fetch fresh data
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

    if (!res.ok) {
      console.error(`Failed to fetch server status: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const servers = (data.servers || []) as any[];
    return servers.find((s: any) => s.id === id) ?? null;
  } catch (error: any) {
    console.error('Error fetching server status:', error);
    return null;
  }
}

async function ServerDetailContent({ serverId }: { serverId: number }) {
  const server = await getServerWithStatus(serverId);

  if (!server) {
    notFound();
  }

  const address = server.hidePort || server.port === 25565 ? server.address : `${server.address}:${server.port}`;
  const players = server.players ?? { online: 0, max: 0, list: [] };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Button variant="ghost" asChild>
        <a href="/servers" className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Servers
        </a>
      </Button>

      <Card variant="glass">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl flex items-center gap-3">
                {server.name}
                {server.modpackName && (
                  <Badge variant="neon-purple">{server.modpackName}</Badge>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {server.version || 'Unknown Version'}
              </p>
              <p className="text-sm text-muted-foreground mt-1 font-mono">
                {address}
              </p>
            </div>
            <Badge variant={server.online ? 'success' : 'error'} className="flex items-center gap-1">
              {server.online ? (
                <>
                  <Wifi className="w-3 h-3" /> Online
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" /> Offline
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {server.description && (
            <p className="text-muted-foreground">{server.description}</p>
          )}
          {server.motd && (
            <p className="text-sm italic text-muted-foreground border-l-2 border-neon-cyan/50 pl-3">
              {server.motd}
            </p>
          )}

          {/* Server Statistics Graph */}
          <ServerUptimeGraph serverId={serverId} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Players list */}
            <Card variant="glass" className="col-span-1">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" /> Players Online
                </CardTitle>
                <span className="text-sm font-semibold">
                  {players.online}/{players.max}
                </span>
              </CardHeader>
              <CardContent>
                {players.list && players.list.length > 0 ? (
                  <ul className="space-y-1 text-sm">
                    {players.list.map((p: any) => (
                      <li key={p.uuid || p.name} className="flex items-center justify-between">
                        <span>{p.name}</span>
                        {p.uuid && (
                          <span className="text-xs text-muted-foreground font-mono truncate max-w-[160px]">
                            {p.uuid}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {server.online ? 'No players listed.' : 'Server is offline.'}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Map / BlueMap embed */}
            <div className="col-span-2 space-y-3">
              {server.bluemapUrl ? (
                <Card variant="glass" className="h-full">
                  <CardHeader className="pb-2 flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Map className="w-4 h-4" /> World Map
                    </CardTitle>
                    <Button size="sm" variant="neon-outline" asChild>
                      <a href={server.bluemapUrl} target="_blank" rel="noopener noreferrer">
                        Open in new tab
                      </a>
                    </Button>
                  </CardHeader>
                  <CardContent className="h-[480px] p-0 border-t border-border/40 relative">
                    <iframe
                      src={server.bluemapUrl}
                      className="w-full h-full rounded-b-lg border-0"
                      loading="lazy"
                      sandbox="allow-scripts allow-same-origin allow-popups"
                      allow="fullscreen"
                      title={`${server.name} World Map`}
                    />
                    {/* Fallback notice - shown if iframe fails to load */}
                    <div className="absolute bottom-2 left-2 right-2 text-center">
                      <p className="text-xs text-muted-foreground/50">
                        If the map doesn&apos;t load, <a href={server.bluemapUrl} target="_blank" rel="noopener noreferrer" className="text-neon-cyan hover:underline">open it in a new tab</a>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card variant="glass">
                  <CardContent className="py-10 text-center text-muted-foreground">
                    No map has been configured for this server.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function ServerDetailPage({ params }: ServerDetailParams) {
  const { id } = await params;
  const serverId = Number.parseInt(id, 10);
  if (Number.isNaN(serverId)) notFound();

  return (
    <Suspense fallback={<ServerDetailSkeleton />}>
      <ServerDetailContent serverId={serverId} />
    </Suspense>
  );
}

