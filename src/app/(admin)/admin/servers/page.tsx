'use client';

import { useState, useEffect } from 'react';
import {
  Server, Plus, Edit, Trash2, RefreshCw,
  Wifi, WifiOff, Users, Save, X, Key, Copy, Eye, EyeOff, Gamepad2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface ServerData {
  id: number;
  name: string;
  description: string | null;
  address: string;
  port: number;
  hidePort: boolean;
  modpackName: string | null;
  bluemapUrl: string | null;
  curseforgeUrl: string | null;
  status: string;
  playersOnline: number;
  playersMax: number;
  version: string | null;
  orderIndex: number;
  apiKey: string | null;
  pterodactylServerId: string | null;
  pterodactylPanelUrl: string | null;
}

export default function AdminServersPage() {
  const [servers, setServers] = useState<ServerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingServer, setEditingServer] = useState<ServerData | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newServer, setNewServer] = useState({
    name: '',
    description: '',
    address: '',
    port: 25565,
    hidePort: false,
    modpackName: '',
    bluemapUrl: '',
    curseforgeUrl: '',
    pterodactylServerId: '',
    pterodactylPanelUrl: '',
  });
  const [editServerData, setEditServerData] = useState({
    name: '',
    description: '',
    address: '',
    port: 25565,
    hidePort: false,
    modpackName: '',
    bluemapUrl: '',
    curseforgeUrl: '',
    pterodactylServerId: '',
    pterodactylPanelUrl: '',
  });
  const [showApiKey, setShowApiKey] = useState<number | null>(null);
  const [copiedApiKey, setCopiedApiKey] = useState<number | null>(null);

  useEffect(() => {
    fetchServers();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchServers, 60000);
    return () => clearInterval(interval);
  }, []);

  const generateApiKey = async (serverId: number) => {
    if (!confirm('Generate a new API key? This will invalidate any existing key.')) return;

    try {
      const res = await fetch(`/api/servers/${serverId}/api-key`, { method: 'POST' });
      if (res.ok) {
        const { apiKey } = await res.json();
        setServers(prev => prev.map(s => s.id === serverId ? { ...s, apiKey } : s));
        setShowApiKey(serverId);
      }
    } catch (err) {
      console.error('Failed to generate API key:', err);
    }
  };

  const copyApiKey = (serverId: number, apiKey: string) => {
    navigator.clipboard.writeText(apiKey);
    setCopiedApiKey(serverId);
    setTimeout(() => setCopiedApiKey(null), 2000);
  };


  const fetchServers = async () => {
    try {
      // Fetch servers with live status
      const res = await fetch('/api/servers/status');
      if (res.ok) {
        const data = await res.json();
        // Map the status response to our ServerData format
        const serversWithStatus = (data.servers || []).map((server: any) => ({
          id: server.id,
          name: server.name,
          description: server.description,
          address: server.address,
          port: server.port,
          hidePort: server.hidePort || false,
          modpackName: server.modpackName,
          bluemapUrl: server.bluemapUrl,
          curseforgeUrl: server.curseforgeUrl,
          status: server.online ? 'online' : 'offline',
          playersOnline: server.players?.online || 0,
          playersMax: server.players?.max || 0,
          version: server.version,
          orderIndex: server.orderIndex,
          apiKey: server.apiKey,
        }));
        setServers(serversWithStatus);
      }
    } catch (err) {
      console.error('Failed to fetch servers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddServer = async () => {
    try {
      const res = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newServer),
      });

      if (res.ok) {
        const server = await res.json();
        setServers([...servers, server]);
        setShowAddForm(false);
        setNewServer({
          name: '',
          description: '',
          address: '',
          port: 25565,
          hidePort: false,
          modpackName: '',
          bluemapUrl: '',
          curseforgeUrl: '',
          pterodactylServerId: '',
          pterodactylPanelUrl: '',
        });
      }
    } catch (err) {
      console.error('Failed to add server:', err);
    }
  };

  const handleDeleteServer = async (id: number) => {
    if (!confirm('Are you sure you want to delete this server?')) return;

    try {
      const res = await fetch(`/api/servers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setServers(servers.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete server:', err);
    }
  };

  const startEditServer = (server: ServerData) => {
    setEditingServer(server);
    setEditServerData({
      name: server.name,
      description: server.description || '',
      address: server.address,
      port: server.port,
      hidePort: server.hidePort || false,
      modpackName: server.modpackName || '',
      bluemapUrl: server.bluemapUrl || '',
      curseforgeUrl: server.curseforgeUrl || '',
      pterodactylServerId: server.pterodactylServerId || '',
      pterodactylPanelUrl: server.pterodactylPanelUrl || '',
    });
  };

  const handleUpdateServer = async () => {
    if (!editingServer) return;

    try {
      const res = await fetch(`/api/servers/${editingServer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editServerData),
      });

      if (res.ok) {
        const updated = await res.json();
        setServers(prev => prev.map(s => (s.id === updated.id ? { ...s, ...updated } : s)));
        setEditingServer(null);
      }
    } catch (err) {
      console.error('Failed to update server:', err);
    }
  };

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Server Management</h1>
          <p className="text-muted-foreground">
            Manage your Minecraft servers
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="neon-outline" onClick={fetchServers}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="gradient" onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Server
          </Button>
        </div>
      </div>

      {/* Add Server Form */}
      {showAddForm && (
        <Card variant="neon-glow">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Add New Server
              <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Server Name *</label>
                <Input
                  value={newServer.name}
                  onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
                  placeholder="e.g., Survival Server"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">IP Address *</label>
                <Input
                  value={newServer.address}
                  onChange={(e) => setNewServer({ ...newServer, address: e.target.value })}
                  placeholder="e.g., play.example.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Port</label>
                <Input
                  type="number"
                  value={Number.isNaN(newServer.port) ? '' : newServer.port}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty string in the UI without storing NaN
                    if (value === '') {
                      setNewServer({ ...newServer, port: 0 });
                      return;
                    }
                    const parsed = parseInt(value, 10);
                    setNewServer({ ...newServer, port: Number.isNaN(parsed) ? 0 : parsed });
                  }}
                  placeholder="25565"
                />
                <label className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                  <input
                    type="checkbox"
                    checked={newServer.hidePort}
                    onChange={(e) => setNewServer({ ...newServer, hidePort: e.target.checked })}
                    className="rounded border-border"
                  />
                  Hide port (for SRV records)
                </label>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Modpack Name</label>
                <Input
                  value={newServer.modpackName}
                  onChange={(e) => setNewServer({ ...newServer, modpackName: e.target.value })}
                  placeholder="e.g., All The Mods 9"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={newServer.description}
                  onChange={(e) => setNewServer({ ...newServer, description: e.target.value })}
                  placeholder="Server description"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">BlueMap URL</label>
                <Input
                  value={newServer.bluemapUrl}
                  onChange={(e) => setNewServer({ ...newServer, bluemapUrl: e.target.value })}
                  placeholder="https://map.example.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">CurseForge URL</label>
                <Input
                  value={newServer.curseforgeUrl}
                  onChange={(e) => setNewServer({ ...newServer, curseforgeUrl: e.target.value })}
                  placeholder="https://curseforge.com/..."
                />
              </div>
            </div>

            {/* Pterodactyl Panel Integration */}
            <div className="border-t border-border pt-4 mt-4">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-neon-purple" />
                Pterodactyl Panel (Optional)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Panel Server ID</label>
                  <Input
                    value={newServer.pterodactylServerId}
                    onChange={(e) => setNewServer({ ...newServer, pterodactylServerId: e.target.value })}
                    placeholder="e.g., a1b2c3d4"
                  />
                  <p className="text-xs text-muted-foreground">The server identifier from your Pterodactyl panel</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Custom Panel URL</label>
                  <Input
                    value={newServer.pterodactylPanelUrl}
                    onChange={(e) => setNewServer({ ...newServer, pterodactylPanelUrl: e.target.value })}
                    placeholder="https://panel.example.com (optional)"
                  />
                  <p className="text-xs text-muted-foreground">Leave empty to use the global panel URL</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button
                variant="gradient"
                onClick={handleAddServer}
                disabled={!newServer.name || !newServer.address}
              >
                <Save className="w-4 h-4 mr-2" />
                Add Server
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {editingServer && (
        <Card variant="neon-glow">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Edit Server
              <Button variant="ghost" size="icon" onClick={() => setEditingServer(null)}>
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Server Name *</label>
                <Input
                  value={editServerData.name}
                  onChange={(e) => setEditServerData({ ...editServerData, name: e.target.value })}
                  placeholder="e.g., Survival Server"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">IP Address *</label>
                <Input
                  value={editServerData.address}
                  onChange={(e) => setEditServerData({ ...editServerData, address: e.target.value })}
                  placeholder="e.g., play.example.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Port</label>
                <Input
                  type="number"
                  value={Number.isNaN(editServerData.port) ? '' : editServerData.port}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setEditServerData({ ...editServerData, port: 0 });
                      return;
                    }
                    const parsed = parseInt(value, 10);
                    setEditServerData({ ...editServerData, port: Number.isNaN(parsed) ? 0 : parsed });
                  }}
                  placeholder="25565"
                />
                <label className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                  <input
                    type="checkbox"
                    checked={editServerData.hidePort}
                    onChange={(e) => setEditServerData({ ...editServerData, hidePort: e.target.checked })}
                    className="rounded border-border"
                  />
                  Hide port (for SRV records)
                </label>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Modpack Name</label>
                <Input
                  value={editServerData.modpackName}
                  onChange={(e) => setEditServerData({ ...editServerData, modpackName: e.target.value })}
                  placeholder="e.g., All The Mods 9"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={editServerData.description}
                  onChange={(e) => setEditServerData({ ...editServerData, description: e.target.value })}
                  placeholder="Server description"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">BlueMap URL</label>
                <Input
                  value={editServerData.bluemapUrl}
                  onChange={(e) => setEditServerData({ ...editServerData, bluemapUrl: e.target.value })}
                  placeholder="https://map.example.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">CurseForge URL</label>
                <Input
                  value={editServerData.curseforgeUrl}
                  onChange={(e) => setEditServerData({ ...editServerData, curseforgeUrl: e.target.value })}
                  placeholder="https://curseforge.com/..."
                />
              </div>
            </div>

            {/* Pterodactyl Panel Integration */}
            <div className="border-t border-border pt-4 mt-4">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-neon-purple" />
                Pterodactyl Panel (Optional)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Panel Server ID</label>
                  <Input
                    value={editServerData.pterodactylServerId}
                    onChange={(e) => setEditServerData({ ...editServerData, pterodactylServerId: e.target.value })}
                    placeholder="e.g., a1b2c3d4"
                  />
                  <p className="text-xs text-muted-foreground">The server identifier from your Pterodactyl panel</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Custom Panel URL</label>
                  <Input
                    value={editServerData.pterodactylPanelUrl}
                    onChange={(e) => setEditServerData({ ...editServerData, pterodactylPanelUrl: e.target.value })}
                    placeholder="https://panel.example.com (optional)"
                  />
                  <p className="text-xs text-muted-foreground">Leave empty to use the global panel URL</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditingServer(null)}>
                Cancel
              </Button>
              <Button
                variant="gradient"
                onClick={handleUpdateServer}
                disabled={!editServerData.name || !editServerData.address}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Servers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {servers.map((server) => (
          <Card key={server.id} variant="glass">
            <div className={`h-1 ${server.status === 'online' ? 'bg-success' : 'bg-error'}`} />
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="w-5 h-5 text-neon-cyan" />
                    {server.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {server.hidePort ? server.address : `${server.address}:${server.port}`}
                    {server.hidePort && <span className="text-xs ml-2 text-neon-purple">(SRV)</span>}
                  </p>
                </div>
                <Badge variant={server.status === 'online' ? 'success' : 'error'}>
                  {server.status === 'online' ? (
                    <><Wifi className="w-3 h-3 mr-1" /> Online</>
                  ) : (
                    <><WifiOff className="w-3 h-3 mr-1" /> Offline</>
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {server.description && (
                <p className="text-sm text-muted-foreground mb-4">
                  {server.description}
                </p>
              )}

              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-neon-purple" />
                  <span className="text-sm">
                    {server.playersOnline}/{server.playersMax}
                  </span>
                </div>
                {server.version && (
                  <Badge variant="secondary">{server.version}</Badge>
                )}
              </div>

              {/* API Key Section for XP Sync */}
              <div className="mb-4 p-3 rounded-lg bg-background/50 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Key className="w-4 h-4 text-neon-purple" />
                    XP Sync API Key
                  </span>
                  {server.apiKey ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowApiKey(showApiKey === server.id ? null : server.id)}
                    >
                      {showApiKey === server.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  ) : null}
                </div>
                {server.apiKey ? (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-background px-2 py-1 rounded font-mono truncate">
                      {showApiKey === server.id ? server.apiKey : '••••••••••••••••••••••••'}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyApiKey(server.id, server.apiKey!)}
                      title="Copy API Key"
                    >
                      {copiedApiKey === server.id ? '✓' : <Copy className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => generateApiKey(server.id)}
                      title="Regenerate"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="neon-outline"
                    size="sm"
                    className="w-full"
                    onClick={() => generateApiKey(server.id)}
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Generate API Key
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="neon-outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => startEditServer(server)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteServer(server.id)}
                  className="text-error hover:text-error"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {servers.length === 0 && !isLoading && (
        <Card variant="glass" className="text-center py-12">
          <CardContent>
            <Server className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-bold mb-2">No Servers</h3>
            <p className="text-muted-foreground mb-4">
              Add your first server to get started
            </p>
            <Button variant="gradient" onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Server
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

