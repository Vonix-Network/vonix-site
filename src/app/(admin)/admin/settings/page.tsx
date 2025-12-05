'use client';

import { useState, useEffect } from 'react';
import {
  Settings, Save, Loader2, Check, Globe,
  Shield, CreditCard, Bell, Database, Key, Mail, Send, CheckCircle, XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ToggleCard } from '@/components/ui/toggle-switch';

interface SiteSettings {
  siteName: string;
  siteDescription: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  requireRegistrationCode: boolean;
  defaultUserRole: string;
  maxLoginAttempts: number;
  lockoutDuration: number;
  // Stripe settings
  stripeMode: 'test' | 'live';
  stripeTestPublishableKey: string;
  stripeTestSecretKey: string;
  stripeLivePublishableKey: string;
  stripeLiveSecretKey: string;
  stripeWebhookSecret: string;
  // SMTP settings
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpFromEmail: string;
  smtpFromName: string;
  smtpSecure: boolean;
}

const defaultSettings: SiteSettings = {
  siteName: 'Vonix Network',
  siteDescription: 'The Ultimate Minecraft Community',
  maintenanceMode: false,
  registrationEnabled: true,
  requireRegistrationCode: true,
  defaultUserRole: 'user',
  maxLoginAttempts: 5,
  lockoutDuration: 15,
  // Stripe defaults
  stripeMode: 'test',
  stripeTestPublishableKey: '',
  stripeTestSecretKey: '',
  stripeLivePublishableKey: '',
  stripeLiveSecretKey: '',
  stripeWebhookSecret: '',
  // SMTP defaults
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPassword: '',
  smtpFromEmail: '',
  smtpFromName: 'Vonix Network',
  smtpSecure: true,
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(true);

  // Test email state
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings({ ...defaultSettings, ...data });
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'email', label: 'Email / SMTP', icon: Mail },
    { id: 'database', label: 'Database', icon: Database },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) return;

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setTestResult({ success: true, message: 'Test email sent successfully!' });
      } else {
        setTestResult({ success: false, message: data.error || 'Failed to send test email' });
      }
    } catch (err) {
      setTestResult({ success: false, message: 'Failed to send test email' });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Site Settings</h1>
          <p className="text-muted-foreground">
            Configure your Vonix Network settings
          </p>
        </div>
        <Button
          variant="gradient"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <Card variant="glass" className="lg:col-span-1">
          <CardContent className="p-2">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${activeTab === tab.id
                    ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30'
                    : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>

        {/* Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <Card variant="glass">
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Basic site configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Site Name</label>
                  <Input
                    value={settings.siteName}
                    onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                    placeholder="Vonix Network"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Site Description</label>
                  <Input
                    value={settings.siteDescription}
                    onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                    placeholder="The Ultimate Minecraft Community"
                  />
                </div>
                <ToggleCard
                  checked={settings.maintenanceMode}
                  onChange={(val) => setSettings({ ...settings, maintenanceMode: val })}
                  label="Maintenance Mode"
                  description="Temporarily disable site access for non-admins"
                />
              </CardContent>
            </Card>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Authentication and security configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ToggleCard
                  checked={settings.registrationEnabled}
                  onChange={(val) => setSettings({ ...settings, registrationEnabled: val })}
                  label="Enable Registration"
                  description="Allow new users to create accounts"
                />
                <ToggleCard
                  checked={settings.requireRegistrationCode}
                  onChange={(val) => setSettings({ ...settings, requireRegistrationCode: val })}
                  label="Require Registration Code"
                  description="Users must verify via Minecraft server first"
                />
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Login Attempts</label>
                  <Input
                    type="number"
                    value={settings.maxLoginAttempts}
                    onChange={(e) => setSettings({ ...settings, maxLoginAttempts: parseInt(e.target.value) })}
                    placeholder="5"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Lockout Duration (minutes)</label>
                  <Input
                    type="number"
                    value={settings.lockoutDuration}
                    onChange={(e) => setSettings({ ...settings, lockoutDuration: parseInt(e.target.value) })}
                    placeholder="15"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Settings */}
          {activeTab === 'payments' && (
            <>
              <Card variant="glass">
                <CardHeader>
                  <CardTitle>Stripe Mode</CardTitle>
                  <CardDescription>
                    Switch between test and live mode for payments
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Mode Toggle */}
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50">
                    <span className="font-medium flex-1">Current Mode</span>
                    <div className="flex items-center gap-2 p-1 rounded-lg bg-background/50">
                      <button
                        onClick={() => setSettings({ ...settings, stripeMode: 'test' })}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${settings.stripeMode === 'test'
                          ? 'bg-neon-orange text-white shadow-lg'
                          : 'text-muted-foreground hover:text-foreground'
                          }`}
                      >
                        🧪 Test Mode
                      </button>
                      <button
                        onClick={() => setSettings({ ...settings, stripeMode: 'live' })}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${settings.stripeMode === 'live'
                          ? 'bg-success text-white shadow-lg'
                          : 'text-muted-foreground hover:text-foreground'
                          }`}
                      >
                        🚀 Live Mode
                      </button>
                    </div>
                  </div>

                  {settings.stripeMode === 'test' && (
                    <div className="p-4 rounded-lg bg-neon-orange/10 border border-neon-orange/30">
                      <p className="text-sm text-neon-orange font-medium">
                        ⚠️ Test Mode Active - No real charges will be made
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Use Stripe test card: 4242 4242 4242 4242
                      </p>
                    </div>
                  )}

                  {settings.stripeMode === 'live' && (
                    <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                      <p className="text-sm text-success font-medium">
                        🚀 Live Mode Active - Real payments are enabled
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card variant="glass">
                <CardHeader>
                  <CardTitle>
                    {settings.stripeMode === 'test' ? '🧪 Test' : '🚀 Live'} API Keys
                  </CardTitle>
                  <CardDescription>
                    {settings.stripeMode === 'test'
                      ? 'Configure your Stripe test API keys for development'
                      : 'Configure your Stripe live API keys for production'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {settings.stripeMode === 'test' ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Test Publishable Key</label>
                        <Input
                          type="password"
                          value={settings.stripeTestPublishableKey}
                          onChange={(e) => setSettings({ ...settings, stripeTestPublishableKey: e.target.value })}
                          placeholder="pk_test_..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Test Secret Key</label>
                        <Input
                          type="password"
                          value={settings.stripeTestSecretKey}
                          onChange={(e) => setSettings({ ...settings, stripeTestSecretKey: e.target.value })}
                          placeholder="sk_test_..."
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Live Publishable Key</label>
                        <Input
                          type="password"
                          value={settings.stripeLivePublishableKey}
                          onChange={(e) => setSettings({ ...settings, stripeLivePublishableKey: e.target.value })}
                          placeholder="pk_live_..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Live Secret Key</label>
                        <Input
                          type="password"
                          value={settings.stripeLiveSecretKey}
                          onChange={(e) => setSettings({ ...settings, stripeLiveSecretKey: e.target.value })}
                          placeholder="sk_live_..."
                        />
                      </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Webhook Secret</label>
                    <Input
                      type="password"
                      value={settings.stripeWebhookSecret}
                      onChange={(e) => setSettings({ ...settings, stripeWebhookSecret: e.target.value })}
                      placeholder="whsec_..."
                    />
                  </div>
                </CardContent>
              </Card>

              <Card variant="glass">
                <CardHeader>
                  <CardTitle>Webhook Configuration</CardTitle>
                  <CardDescription>
                    Add this URL to your Stripe webhook settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-4 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30">
                    <h4 className="font-medium mb-2">Webhook URL</h4>
                    <code className="text-sm bg-secondary px-2 py-1 rounded block break-all">
                      {typeof window !== 'undefined' ? window.location.origin : ''}/api/stripe/webhook
                    </code>
                    <p className="text-xs text-muted-foreground mt-2">
                      Events to listen for: checkout.session.completed, invoice.payment_succeeded, customer.subscription.*
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Notification Types</CardTitle>
                <CardDescription>
                  Configure which notifications are enabled site-wide
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ToggleCard
                  checked={true}
                  onChange={() => { }}
                  label="Email Notifications"
                  description="Send email notifications to users"
                />
                <ToggleCard
                  checked={true}
                  onChange={() => { }}
                  label="Forum Replies"
                  description="Notify users when they receive forum replies"
                />
                <ToggleCard
                  checked={true}
                  onChange={() => { }}
                  label="Friend Requests"
                  description="Notify users of new friend requests"
                />
                <ToggleCard
                  checked={true}
                  onChange={() => { }}
                  label="Server Updates"
                  description="Notify users of server status changes"
                />
                <div className="p-4 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30">
                  <p className="text-sm text-neon-cyan">
                    💡 Configure SMTP settings in the Email / SMTP tab to enable email notifications.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Email/SMTP Settings */}
          {activeTab === 'email' && (
            <>
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-neon-cyan" />
                    SMTP Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure your email server for sending notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">SMTP Host</label>
                      <Input
                        value={settings.smtpHost}
                        onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                        placeholder="smtp.gmail.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">SMTP Port</label>
                      <Input
                        type="number"
                        value={settings.smtpPort}
                        onChange={(e) => setSettings({ ...settings, smtpPort: parseInt(e.target.value) || 587 })}
                        placeholder="587"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Username / Email</label>
                      <Input
                        value={settings.smtpUser}
                        onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                        placeholder="noreply@vonixnetwork.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Password / App Password</label>
                      <Input
                        type="password"
                        value={settings.smtpPassword}
                        onChange={(e) => setSettings({ ...settings, smtpPassword: e.target.value })}
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">From Email</label>
                      <Input
                        value={settings.smtpFromEmail}
                        onChange={(e) => setSettings({ ...settings, smtpFromEmail: e.target.value })}
                        placeholder="noreply@vonixnetwork.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">From Name</label>
                      <Input
                        value={settings.smtpFromName}
                        onChange={(e) => setSettings({ ...settings, smtpFromName: e.target.value })}
                        placeholder="Vonix Network"
                      />
                    </div>
                  </div>
                  <ToggleCard
                    checked={settings.smtpSecure}
                    onChange={(val) => setSettings({ ...settings, smtpSecure: val })}
                    label="Use TLS/SSL"
                    description="Enable secure connection (recommended)"
                  />
                </CardContent>
              </Card>

              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="w-5 h-5 text-neon-purple" />
                    Test Email Configuration
                  </CardTitle>
                  <CardDescription>
                    Send a test email to verify your SMTP settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4">
                    <Input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="flex-1"
                    />
                    <Button
                      variant="neon"
                      onClick={sendTestEmail}
                      disabled={isSendingTest || !testEmail || !settings.smtpHost}
                    >
                      {isSendingTest ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send Test
                        </>
                      )}
                    </Button>
                  </div>

                  {testResult && (
                    <div className={`p-4 rounded-lg border ${testResult.success
                        ? 'bg-success/10 border-success/30'
                        : 'bg-error/10 border-error/30'
                      }`}>
                      <div className="flex items-center gap-2">
                        {testResult.success ? (
                          <CheckCircle className="w-5 h-5 text-success" />
                        ) : (
                          <XCircle className="w-5 h-5 text-error" />
                        )}
                        <span className={testResult.success ? 'text-success' : 'text-error'}>
                          {testResult.message}
                        </span>
                      </div>
                    </div>
                  )}

                  {!settings.smtpHost && (
                    <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
                      <p className="text-sm text-warning">
                        ⚠️ Please configure SMTP settings above before testing.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card variant="glass">
                <CardHeader>
                  <CardTitle>Common SMTP Providers</CardTitle>
                  <CardDescription>
                    Quick reference for popular email providers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <h4 className="font-medium mb-2">Gmail</h4>
                      <code className="text-xs block">Host: smtp.gmail.com</code>
                      <code className="text-xs block">Port: 587 (TLS) or 465 (SSL)</code>
                      <p className="text-xs text-muted-foreground mt-2">
                        Requires App Password if 2FA enabled
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <h4 className="font-medium mb-2">SendGrid</h4>
                      <code className="text-xs block">Host: smtp.sendgrid.net</code>
                      <code className="text-xs block">Port: 587</code>
                      <p className="text-xs text-muted-foreground mt-2">
                        User: apikey, Password: Your API key
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <h4 className="font-medium mb-2">Mailgun</h4>
                      <code className="text-xs block">Host: smtp.mailgun.org</code>
                      <code className="text-xs block">Port: 587</code>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <h4 className="font-medium mb-2">Amazon SES</h4>
                      <code className="text-xs block">Host: email-smtp.[region].amazonaws.com</code>
                      <code className="text-xs block">Port: 587</code>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Database Settings */}
          {activeTab === 'database' && (
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Database Settings</CardTitle>
                <CardDescription>
                  Database management and maintenance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-secondary/50">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-medium">Database</span>
                    <Badge variant="success">SQLite (Turso)</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="neon-outline" className="w-full">
                    <Database className="w-4 h-4 mr-2" />
                    Run Migrations
                  </Button>
                  <Button variant="neon-outline" className="w-full">
                    <Key className="w-4 h-4 mr-2" />
                    Generate API Key
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
