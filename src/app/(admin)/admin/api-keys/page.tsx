'use client';

import { useState, useEffect } from 'react';
import { 
  Key, Plus, Copy, Trash2, RefreshCw,
  Eye, EyeOff, Check, Shield, Server
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

interface ApiKey {
  id: number;
  name: string;
  key: string;
  createdAt: Date;
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<number>>(new Set());
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const res = await fetch('/api/admin/api-keys');
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data);
      }
    } catch (err) {
      console.error('Failed to fetch API keys:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateApiKey = async () => {
    if (!newKeyName.trim()) return;

    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName }),
      });

      if (res.ok) {
        const data = await res.json();
        setNewKey(data.key);
        setApiKeys([...apiKeys, data]);
        setNewKeyName('');
      }
    } catch (err) {
      console.error('Failed to generate API key:', err);
    }
  };

  const deleteApiKey = async (id: number) => {
    if (!confirm('Are you sure you want to delete this API key? This cannot be undone.')) return;

    try {
      const res = await fetch(`/api/admin/api-keys/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setApiKeys(apiKeys.filter(k => k.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete API key:', err);
    }
  };

  const toggleKeyVisibility = (id: number) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(id)) {
      newVisible.delete(id);
    } else {
      newVisible.add(id);
    }
    setVisibleKeys(newVisible);
  };

  const copyToClipboard = async (key: string, id: number) => {
    await navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const maskKey = (key: string) => {
    return key.substring(0, 8) + '••••••••••••••••' + key.substring(key.length - 4);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text mb-2">API Keys</h1>
          <p className="text-muted-foreground">
            Manage API keys for Minecraft server integration
          </p>
        </div>
        <Button variant="gradient" onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Generate New Key
        </Button>
      </div>

      {/* Info Card */}
      <Card variant="gradient">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-neon-cyan/20">
              <Server className="w-6 h-6 text-neon-cyan" />
            </div>
            <div>
              <h3 className="font-bold mb-2">Minecraft Server Integration</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Use these API keys to authenticate your Minecraft server or mod with the Vonix Network API.
                Include the key in the <code className="px-1 py-0.5 bg-secondary rounded">X-API-Key</code> header.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="neon">POST /api/minecraft/login</Badge>
                <Badge variant="neon">POST /api/minecraft/register</Badge>
                <Badge variant="neon">POST /api/minecraft/register-direct</Badge>
                <Badge variant="neon">GET /api/minecraft/verify</Badge>
                <Badge variant="neon">POST /api/minecraft/xp</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* New Key Generated Alert */}
      {newKey && (
        <Card variant="neon-glow" className="border-success">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-success/20">
                <Check className="w-5 h-5 text-success" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-success mb-1">API Key Generated Successfully!</p>
                <p className="text-sm text-muted-foreground mb-2">
                  Copy this key now. You won&apos;t be able to see it again.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-secondary rounded font-mono text-sm break-all">
                    {newKey}
                  </code>
                  <Button 
                    variant="neon" 
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(newKey);
                      setNewKey(null);
                    }}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy & Close
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Key Form */}
      {showAddForm && !newKey && (
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Generate New API Key</CardTitle>
            <CardDescription>
              Create a new API key for your Minecraft server
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="Key name (e.g., 'Survival Server')"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="flex-1"
              />
              <Button variant="gradient" onClick={generateApiKey} disabled={!newKeyName.trim()}>
                <Key className="w-4 h-4 mr-2" />
                Generate
              </Button>
              <Button variant="ghost" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Keys List */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-neon-cyan" />
            Active API Keys
          </CardTitle>
        </CardHeader>
        <CardContent>
          {apiKeys.length > 0 ? (
            <div className="space-y-3">
              {apiKeys.map((apiKey) => (
                <div 
                  key={apiKey.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-neon-purple/10">
                      <Shield className="w-5 h-5 text-neon-purple" />
                    </div>
                    <div>
                      <p className="font-medium">{apiKey.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-sm text-muted-foreground font-mono">
                          {visibleKeys.has(apiKey.id) ? apiKey.key : maskKey(apiKey.key)}
                        </code>
                        <button
                          onClick={() => toggleKeyVisibility(apiKey.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {visibleKeys.has(apiKey.id) ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created {formatDate(apiKey.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => copyToClipboard(apiKey.key, apiKey.id)}
                    >
                      {copiedId === apiKey.id ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => deleteApiKey(apiKey.id)}
                      className="text-error hover:text-error"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Key className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-bold mb-2">No API Keys</h3>
              <p className="text-muted-foreground mb-4">
                Generate your first API key to connect your Minecraft server
              </p>
              <Button variant="gradient" onClick={() => setShowAddForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Generate API Key
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documentation */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>API Documentation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold mb-2 text-neon-cyan">🔐 Login (Auth Mod)</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Authenticate a user from your Minecraft auth mod. Returns user info including donation rank.
            </p>
            <pre className="p-4 bg-secondary rounded-lg text-sm overflow-x-auto">
{`POST /api/minecraft/login
Headers: X-API-Key: your-api-key

Body:
{
  "username": "Steve",
  "password": "userpassword"
}

Response (Success):
{
  "success": true,
  "user": {
    "id": 1,
    "username": "Steve",
    "email": "steve@example.com",
    "minecraftUsername": "Steve",
    "minecraftUuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "role": "user",
    "level": 5,
    "xp": 500,
    "totalDonated": 25.00,
    "donationRank": {
      "id": "supporter",
      "name": "Supporter",
      "color": "#00D9FF",
      "textColor": "#00D9FF",
      "icon": "💙",
      "badge": "supporter_badge",
      "glow": true,
      "expiresAt": "2025-02-01T00:00:00Z",
      "isExpired": false,
      "isPaused": false
    }
  }
}

Response (No Rank):
{
  "success": true,
  "user": {
    ...
    "donationRank": null
  }
}

Response (Error):
{
  "success": false,
  "error": "Invalid username or password"
}`}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold mb-2 text-neon-purple">📋 Generate Registration Code</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Generate a registration code for a player. They use this code on the website to create an account.
            </p>
            <pre className="p-4 bg-secondary rounded-lg text-sm overflow-x-auto">
{`POST /api/minecraft/register
Headers: X-API-Key: your-api-key

Body:
{
  "minecraft_username": "Steve",
  "minecraft_uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}

Response:
{
  "success": true,
  "code": "A1B2C3D4",
  "expiresAt": "2024-01-01T00:15:00Z",
  "minecraft_username": "Steve",
  "message": "Registration code generated..."
}`}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold mb-2 text-neon-pink">⚡ Direct Registration</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Register a player directly from the Minecraft mod with /register &lt;password&gt;. Creates account immediately.
            </p>
            <pre className="p-4 bg-secondary rounded-lg text-sm overflow-x-auto">
{`POST /api/minecraft/register-direct
Headers: X-API-Key: your-api-key

Body:
{
  "minecraft_username": "Steve",
  "minecraft_uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "password": "securepassword123"
}

Response (Success):
{
  "success": true,
  "message": "Account created successfully for Steve",
  "user": {
    "id": 1,
    "username": "Steve",
    "minecraft_username": "Steve",
    "minecraft_uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "role": "user",
    "total_donated": 0,
    "donation_rank_id": null,
    "donation_rank": null
  }
}

Response (Error - Already Registered):
{
  "error": "This Minecraft account is already registered. Use /login <password> instead."
}`}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold mb-2">✅ Verify Player</h4>
            <pre className="p-4 bg-secondary rounded-lg text-sm overflow-x-auto">
{`GET /api/minecraft/verify?uuid=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Headers: X-API-Key: your-api-key

Response:
{
  "verified": true,
  "user": {
    "id": 1,
    "username": "Steve",
    "role": "user",
    "level": 5,
    "xp": 500
  }
}`}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Award XP</h4>
            <pre className="p-4 bg-secondary rounded-lg text-sm overflow-x-auto">
{`POST /api/minecraft/xp
Headers: X-API-Key: your-api-key

Body:
{
  "uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "amount": 10,
  "source": "mining",
  "description": "Mined 100 blocks"
}

Response:
{
  "success": true,
  "xp": 510,
  "level": 5,
  "leveledUp": false
}`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
