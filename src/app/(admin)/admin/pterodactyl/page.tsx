'use client';

import { useState, useEffect } from 'react';
import {
    Settings, Save, RefreshCw, CheckCircle, XCircle, Server, Link as LinkIcon, Key, TestTube
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function PterodactylSettingsPage() {
    const [config, setConfig] = useState({
        panelUrl: '',
        apiKey: '',
        hasApiKey: false,
        configured: false,
        maskedApiKey: null as string | null,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string; serverCount?: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/admin/pterodactyl');
            if (res.ok) {
                const data = await res.json();
                setConfig({
                    panelUrl: data.panelUrl || '',
                    apiKey: '', // Don't show actual key
                    hasApiKey: data.hasApiKey || false,
                    configured: data.configured || false,
                    maskedApiKey: data.maskedApiKey || null,
                });
            }
        } catch (err) {
            console.error('Failed to fetch Pterodactyl config:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTest = async () => {
        if (!config.panelUrl || !config.apiKey) {
            setError('Please enter both Panel URL and API Key to test');
            return;
        }

        setIsTesting(true);
        setTestResult(null);
        setError(null);

        try {
            const res = await fetch('/api/admin/pterodactyl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    panelUrl: config.panelUrl,
                    apiKey: config.apiKey,
                    testOnly: true,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setTestResult({
                    success: true,
                    message: data.message || 'Connection successful',
                    serverCount: data.serverCount,
                });
            } else {
                setTestResult({
                    success: false,
                    message: data.error || 'Connection failed',
                });
            }
        } catch (err) {
            setTestResult({
                success: false,
                message: 'Network error - could not connect',
            });
        } finally {
            setIsTesting(false);
        }
    };

    const handleSave = async () => {
        if (!config.panelUrl || !config.apiKey) {
            setError('Please enter both Panel URL and API Key');
            return;
        }

        setIsSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await fetch('/api/admin/pterodactyl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    panelUrl: config.panelUrl,
                    apiKey: config.apiKey,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(`Configuration saved! Found ${data.serverCount || 0} servers.`);
                // Refresh config to get masked key
                fetchConfig();
                // Clear the API key field after saving
                setConfig(prev => ({ ...prev, apiKey: '' }));
            } else {
                setError(data.error || 'Failed to save configuration');
            }
        } catch (err) {
            setError('Network error - could not save');
        } finally {
            setIsSaving(false);
        }
    };

    const handleClear = async () => {
        if (!confirm('Are you sure you want to clear the Pterodactyl configuration?')) return;

        try {
            const res = await fetch('/api/admin/pterodactyl', { method: 'DELETE' });
            if (res.ok) {
                setSuccess('Configuration cleared');
                setConfig({
                    panelUrl: '',
                    apiKey: '',
                    hasApiKey: false,
                    configured: false,
                    maskedApiKey: null,
                });
                setTestResult(null);
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to clear configuration');
            }
        } catch (err) {
            setError('Network error');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="w-8 h-8 animate-spin text-neon-cyan" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold gradient-text mb-2">Pterodactyl Settings</h1>
                <p className="text-muted-foreground">
                    Configure your Pterodactyl panel integration for server management
                </p>
            </div>

            {/* Status Card */}
            <Card variant="glass">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Server className="w-5 h-5 text-neon-purple" />
                        Connection Status
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        {config.configured ? (
                            <>
                                <Badge variant="success" className="flex items-center gap-1">
                                    <CheckCircle className="w-4 h-4" />
                                    Configured
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                    Panel: {config.panelUrl}
                                </span>
                            </>
                        ) : (
                            <Badge variant="secondary" className="flex items-center gap-1">
                                <XCircle className="w-4 h-4" />
                                Not Configured
                            </Badge>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Configuration Form */}
            <Card variant="neon-glow">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-neon-cyan" />
                        Panel Configuration
                    </CardTitle>
                    <CardDescription>
                        Enter your Pterodactyl panel URL and API key. Use a Client API key generated in your account settings.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {error && (
                        <div className="p-4 rounded-lg bg-error/10 border border-error text-error text-sm">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="p-4 rounded-lg bg-success/10 border border-success text-success text-sm">
                            {success}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <LinkIcon className="w-4 h-4" />
                                Panel URL
                            </label>
                            <Input
                                value={config.panelUrl}
                                onChange={(e) => setConfig({ ...config, panelUrl: e.target.value })}
                                placeholder="https://panel.example.com"
                            />
                            <p className="text-xs text-muted-foreground">
                                The URL of your Pterodactyl panel (no trailing slash)
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Key className="w-4 h-4" />
                                API Key
                            </label>
                            <Input
                                type="password"
                                value={config.apiKey}
                                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                                placeholder={config.maskedApiKey || 'Enter your Client API key'}
                            />
                            <p className="text-xs text-muted-foreground">
                                Generate a Client API key in your Pterodactyl account settings
                                {config.maskedApiKey && (
                                    <span className="ml-2 text-neon-purple">
                                        (Current: {config.maskedApiKey})
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Test Result */}
                    {testResult && (
                        <div className={`p-4 rounded-lg border ${testResult.success
                                ? 'bg-success/10 border-success text-success'
                                : 'bg-error/10 border-error text-error'
                            }`}>
                            <div className="flex items-center gap-2">
                                {testResult.success ? (
                                    <CheckCircle className="w-5 h-5" />
                                ) : (
                                    <XCircle className="w-5 h-5" />
                                )}
                                <span className="font-medium">{testResult.message}</span>
                            </div>
                            {testResult.serverCount !== undefined && (
                                <p className="mt-2 text-sm opacity-80">
                                    Found {testResult.serverCount} server(s) accessible with this API key
                                </p>
                            )}
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <Button
                            variant="neon-outline"
                            onClick={handleTest}
                            disabled={isTesting || !config.panelUrl || !config.apiKey}
                        >
                            {isTesting ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <TestTube className="w-4 h-4 mr-2" />
                            )}
                            Test Connection
                        </Button>
                        <Button
                            variant="gradient"
                            onClick={handleSave}
                            disabled={isSaving || !config.panelUrl || !config.apiKey}
                        >
                            {isSaving ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            Save Configuration
                        </Button>
                        {config.configured && (
                            <Button
                                variant="ghost"
                                onClick={handleClear}
                                className="text-error hover:text-error"
                            >
                                Clear Configuration
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Help Section */}
            <Card variant="glass">
                <CardHeader>
                    <CardTitle>Getting Your API Key</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                        <li>Log in to your Pterodactyl panel</li>
                        <li>Click on your username in the top-right corner</li>
                        <li>Select &ldquo;Account API&rdquo; or &ldquo;API Credentials&rdquo;</li>
                        <li>Create a new API key with a descriptive name (e.g., &ldquo;Vonix Website&rdquo;)</li>
                        <li>Copy the generated key and paste it above</li>
                    </ol>
                    <p className="text-xs text-muted-foreground mt-4">
                        <strong>Note:</strong> The Client API key gives access to servers you have permission to manage.
                        Make sure you have access to all servers you want to control from this panel.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
