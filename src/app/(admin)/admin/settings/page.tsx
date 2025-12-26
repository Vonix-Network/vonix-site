'use client';

import { useState, useEffect } from 'react';
import {
  Settings, Save, Loader2, Check, Globe,
  Shield, CreditCard, Bell, Database, Key, Mail, Send, CheckCircle, XCircle,
  AlertTriangle, MessageSquare, UserPlus, Server, Heart, FileText, Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ToggleCard } from '@/components/ui/toggle-switch';
import { toast } from 'sonner';

interface NotificationSettings {
  emailNotifications: boolean;
  forumReplies: boolean;
  friendRequests: boolean;
  privateMessages: boolean;
  serverUpdates: boolean;
  announcements: boolean;
  donationConfirmations: boolean;
  levelUpNotifications: boolean;
}

interface SiteSettings {
  siteName: string;
  siteDescription: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  registrationEnabled: boolean;
  requireRegistrationCode: boolean;
  defaultUserRole: string;
  maxLoginAttempts: number;
  lockoutDuration: number;
  // Payment provider settings
  paymentProvider: 'stripe' | 'kofi' | 'square' | 'disabled';
  // Stripe settings
  stripeMode: 'test' | 'live';
  stripeTestPublishableKey: string;
  stripeTestSecretKey: string;
  stripeLivePublishableKey: string;
  stripeLiveSecretKey: string;
  stripeWebhookSecret: string;
  // Ko-Fi settings
  kofiVerificationToken: string;
  kofiPageUrl: string;
  // Square settings
  squareMode: 'sandbox' | 'production';
  squareSandboxAccessToken: string;
  squareSandboxApplicationId: string;
  squareProductionAccessToken: string;
  squareProductionApplicationId: string;
  squareWebhookSignatureKey: string;
  squareLocationId: string;
  // SMTP settings
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpFromEmail: string;
  smtpFromName: string;
  smtpSecure: boolean;
  // Admin email notification settings
  smtpAdminNotifyEmail: string;
  smtpAdminNotifyErrors: boolean;
  smtpAdminNotifyDonations: boolean;
  smtpAdminNotifyRegistrations: boolean;
  // Notification settings
  notifications: NotificationSettings;
}

const defaultNotifications: NotificationSettings = {
  emailNotifications: true,
  forumReplies: true,
  friendRequests: true,
  privateMessages: true,
  serverUpdates: true,
  announcements: true,
  donationConfirmations: true,
  levelUpNotifications: true,
};

const defaultSettings: SiteSettings = {
  siteName: 'Vonix Network',
  siteDescription: 'The Ultimate Minecraft Community',
  maintenanceMode: false,
  maintenanceMessage: 'We are working on adding newer and better things!',
  registrationEnabled: true,
  requireRegistrationCode: true,
  defaultUserRole: 'user',
  maxLoginAttempts: 5,
  lockoutDuration: 15,
  // Payment provider defaults
  paymentProvider: 'stripe',
  // Stripe defaults
  stripeMode: 'test',
  stripeTestPublishableKey: '',
  stripeTestSecretKey: '',
  stripeLivePublishableKey: '',
  stripeLiveSecretKey: '',
  stripeWebhookSecret: '',
  // Ko-Fi defaults
  kofiVerificationToken: '',
  kofiPageUrl: '',
  // Square defaults
  squareMode: 'sandbox',
  squareSandboxAccessToken: '',
  squareSandboxApplicationId: '',
  squareProductionAccessToken: '',
  squareProductionApplicationId: '',
  squareWebhookSignatureKey: '',
  squareLocationId: '',
  // SMTP defaults
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPassword: '',
  smtpFromEmail: '',
  smtpFromName: 'Vonix Network',
  smtpSecure: true,
  // Admin notification defaults
  smtpAdminNotifyEmail: '',
  smtpAdminNotifyErrors: false,
  smtpAdminNotifyDonations: false,
  smtpAdminNotifyRegistrations: false,
  // Notification defaults
  notifications: defaultNotifications,
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

  // Discord settings state
  const [discordSettings, setDiscordSettings] = useState({
    enabled: false,
    webhookUrl: '',
    botToken: '',
    channelId: '',
    channelName: '',
    // Discord integration (slash commands)
    clientId: '',
    guildId: '',
    // Discord OAuth settings
    oauthClientId: '',
    oauthClientSecret: '',
    oauthRedirectUri: '',
    oauthEnabled: false,
    oauthRegistrationEnabled: false, // Whether OAuth can register new users
    registerRoleId: '', // Role to assign when user registers via Discord
    // Ticket system settings
    ticketForumId: '',
    ticketCategoryId: '',
    ticketStaffRoleId: '',
    ticketPingRoleId: '',
    // Viscord (Minecraft server embeds) channel
    viscordChannelId: '',
    viscordChannelName: '',
    // Donation events webhook (optional)
    donationWebhookUrl: '',
    donationWebhookAvatarUrl: '',
  });
  const [discordLoading, setDiscordLoading] = useState(true);
  const [discordSaving, setDiscordSaving] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings({
            ...defaultSettings,
            ...data,
            notifications: { ...defaultNotifications, ...(data.notifications || {}) },
          });
        }

        // Also fetch Discord settings
        const discordRes = await fetch('/api/discord-chat/settings');
        if (discordRes.ok) {
          const discordData = await discordRes.json();
          setDiscordSettings({
            enabled: discordData.enabled || false,
            webhookUrl: discordData.webhookUrl || '',
            botToken: discordData.botToken || '',
            channelId: discordData.channelId || '',
            channelName: discordData.channelName || '',
            clientId: discordData.clientId || '',
            guildId: discordData.guildId || '',
            oauthClientId: discordData.oauthClientId || '',
            oauthClientSecret: discordData.oauthClientSecret || '',
            oauthRedirectUri: discordData.oauthRedirectUri || '',
            oauthEnabled: discordData.oauthEnabled || false,
            oauthRegistrationEnabled: discordData.oauthRegistrationEnabled || false,
            registerRoleId: discordData.registerRoleId || '',
            ticketForumId: discordData.ticketForumId || '',
            ticketCategoryId: discordData.ticketCategoryId || '',
            ticketStaffRoleId: discordData.ticketStaffRoleId || '',
            ticketPingRoleId: discordData.ticketPingRoleId || '',
            viscordChannelId: discordData.viscordChannelId || '',
            viscordChannelName: discordData.viscordChannelName || '',
            donationWebhookUrl: discordData.donationWebhookUrl || '',
            donationWebhookAvatarUrl: discordData.donationWebhookAvatarUrl || '',
          });
        }
      } catch (err: any) {
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
    { id: 'discord', label: 'Discord', icon: MessageSquare },
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
        toast.success('Settings saved successfully');
        setTimeout(() => setSaved(false), 2000);
      } else {
        toast.error('Failed to save settings');
      }
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const updateNotification = (key: keyof NotificationSettings, value: boolean) => {
    setSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: value,
      },
    });
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
    } catch (err: any) {
      setTestResult({ success: false, message: 'Failed to send test email' });
    } finally {
      setIsSendingTest(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
            <>
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
                </CardContent>
              </Card>

              {/* Maintenance Mode Card */}
              <Card variant="glass" className={settings.maintenanceMode ? 'border-warning' : ''}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className={`w-5 h-5 ${settings.maintenanceMode ? 'text-warning' : 'text-muted-foreground'}`} />
                    Maintenance Mode
                  </CardTitle>
                  <CardDescription>
                    Enable maintenance mode to restrict site access
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ToggleCard
                    checked={settings.maintenanceMode}
                    onChange={(val) => setSettings({ ...settings, maintenanceMode: val })}
                    label="Enable Maintenance Mode"
                    description="Only admins, moderators, and owners can access the site"
                  />

                  {settings.maintenanceMode && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Maintenance Message</label>
                      <textarea
                        value={settings.maintenanceMessage}
                        onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
                        placeholder="Under Maintenance, Expect possible downtimes."
                        className="w-full min-h-[80px] px-3 py-2 rounded-lg bg-secondary/50 border border-border focus:outline-none focus:ring-2 focus:ring-neon-cyan"
                      />
                    </div>
                  )}

                  {settings.maintenanceMode && (
                    <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
                      <p className="text-sm text-warning font-medium">
                        ⚠️ Maintenance mode is enabled
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Regular users will see the maintenance page. Staff members can log in to bypass.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
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

                {/* Info box based on registration code setting */}
                <div className={`p-4 rounded-lg border ${settings.requireRegistrationCode
                  ? 'bg-neon-cyan/10 border-neon-cyan/30'
                  : 'bg-neon-purple/10 border-neon-purple/30'
                  }`}>
                  <p className={`text-sm font-medium ${settings.requireRegistrationCode ? 'text-neon-cyan' : 'text-neon-purple'
                    }`}>
                    {settings.requireRegistrationCode
                      ? '🎮 Registration requires Minecraft verification'
                      : '📝 Standard username/password registration enabled'
                    }
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {settings.requireRegistrationCode
                      ? 'Users must run /register in-game to get a registration code'
                      : 'Users can register with just a username and password'
                    }
                  </p>
                </div>

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
              {/* Payment Provider Selection */}
              <Card variant="glass">
                <CardHeader>
                  <CardTitle>Payment Provider</CardTitle>
                  <CardDescription>
                    Choose which payment provider to use for donations, or disable donations entirely
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                    <button
                      onClick={() => setSettings({ ...settings, paymentProvider: 'stripe' })}
                      className={`p-4 rounded-lg border-2 text-center transition-all ${settings.paymentProvider === 'stripe'
                        ? 'border-neon-purple bg-neon-purple/10 text-neon-purple'
                        : 'border-border hover:border-neon-purple/50 text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      <div className="text-2xl mb-2">💳</div>
                      <div className="font-medium">Stripe</div>
                      <div className="text-xs mt-1 opacity-70">Cards & Subscriptions</div>
                    </button>
                    <button
                      onClick={() => setSettings({ ...settings, paymentProvider: 'square' })}
                      className={`p-4 rounded-lg border-2 text-center transition-all ${settings.paymentProvider === 'square'
                        ? 'border-neon-green bg-neon-green/10 text-neon-green'
                        : 'border-border hover:border-neon-green/50 text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      <div className="text-2xl mb-2">⬜</div>
                      <div className="font-medium">Square</div>
                      <div className="text-xs mt-1 opacity-70">Cards & Subscriptions</div>
                    </button>
                    <button
                      onClick={() => setSettings({ ...settings, paymentProvider: 'kofi' })}
                      className={`p-4 rounded-lg border-2 text-center transition-all ${settings.paymentProvider === 'kofi'
                        ? 'border-neon-pink bg-neon-pink/10 text-neon-pink'
                        : 'border-border hover:border-neon-pink/50 text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      <div className="text-2xl mb-2">☕</div>
                      <div className="font-medium">Ko-Fi</div>
                      <div className="text-xs mt-1 opacity-70">One-Time Only</div>
                    </button>
                    <button
                      onClick={() => setSettings({ ...settings, paymentProvider: 'disabled' })}
                      className={`p-4 rounded-lg border-2 text-center transition-all ${settings.paymentProvider === 'disabled'
                        ? 'border-destructive bg-destructive/10 text-destructive'
                        : 'border-border hover:border-destructive/50 text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      <div className="text-2xl mb-2">🚫</div>
                      <div className="font-medium">Disabled</div>
                      <div className="text-xs mt-1 opacity-70">Donations Off</div>
                    </button>
                  </div>

                  {settings.paymentProvider === 'disabled' && (
                    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                      <p className="text-sm text-destructive font-medium">
                        ⚠️ Donations are disabled
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Users will not be able to donate or purchase ranks on the website.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Stripe Configuration */}
              {settings.paymentProvider === 'stripe' && (
                <>
                  <Card variant="glass">
                    <CardHeader>
                      <CardTitle>Stripe Mode</CardTitle>
                      <CardDescription>
                        Switch between test and live mode for payments
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                      <CardTitle>Stripe Webhook Configuration</CardTitle>
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

              {/* Ko-Fi Configuration */}
              {settings.paymentProvider === 'kofi' && (
                <>
                  <Card variant="glass">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <span>☕</span>
                        Ko-Fi Configuration
                      </CardTitle>
                      <CardDescription>
                        Configure your Ko-Fi integration for accepting donations
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 rounded-lg bg-neon-pink/10 border border-neon-pink/30">
                        <p className="text-sm text-neon-pink font-medium">
                          ℹ️ Ko-Fi supports one-time donations only
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Subscriptions require Stripe. Ko-Fi donations will not apply ranks automatically.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Ko-Fi Page URL</label>
                        <Input
                          value={settings.kofiPageUrl}
                          onChange={(e) => setSettings({ ...settings, kofiPageUrl: e.target.value })}
                          placeholder="https://ko-fi.com/yourusername"
                        />
                        <p className="text-xs text-muted-foreground">
                          Your Ko-Fi page URL where users will be redirected to donate
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Verification Token</label>
                        <Input
                          type="password"
                          value={settings.kofiVerificationToken}
                          onChange={(e) => setSettings({ ...settings, kofiVerificationToken: e.target.value })}
                          placeholder="Enter your Ko-Fi verification token"
                        />
                        <p className="text-xs text-muted-foreground">
                          Find this in your Ko-Fi account under Webhooks settings (ko-fi.com/manage/webhooks)
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card variant="glass">
                    <CardHeader>
                      <CardTitle>Ko-Fi Webhook Configuration</CardTitle>
                      <CardDescription>
                        Add this URL to your Ko-Fi webhook settings
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="p-4 rounded-lg bg-neon-pink/10 border border-neon-pink/30">
                        <h4 className="font-medium mb-2">Webhook URL</h4>
                        <code className="text-sm bg-secondary px-2 py-1 rounded block break-all">
                          {typeof window !== 'undefined' ? window.location.origin : ''}/api/kofi/webhook
                        </code>
                        <p className="text-xs text-muted-foreground mt-2">
                          Go to ko-fi.com/manage/webhooks and paste this URL
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Square Configuration */}
              {settings.paymentProvider === 'square' && (
                <>
                  <Card variant="glass">
                    <CardHeader>
                      <CardTitle>Square Mode</CardTitle>
                      <CardDescription>
                        Switch between sandbox and production mode for payments
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50">
                        <span className="font-medium flex-1">Current Mode</span>
                        <div className="flex items-center gap-2 p-1 rounded-lg bg-background/50">
                          <button
                            onClick={() => setSettings({ ...settings, squareMode: 'sandbox' })}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${settings.squareMode === 'sandbox'
                              ? 'bg-neon-orange text-white shadow-lg'
                              : 'text-muted-foreground hover:text-foreground'
                              }`}
                          >
                            🧪 Sandbox
                          </button>
                          <button
                            onClick={() => setSettings({ ...settings, squareMode: 'production' })}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${settings.squareMode === 'production'
                              ? 'bg-success text-white shadow-lg'
                              : 'text-muted-foreground hover:text-foreground'
                              }`}
                          >
                            🚀 Production
                          </button>
                        </div>
                      </div>

                      {settings.squareMode === 'sandbox' && (
                        <div className="p-4 rounded-lg bg-neon-orange/10 border border-neon-orange/30">
                          <p className="text-sm text-neon-orange font-medium">
                            ⚠️ Sandbox Mode Active - No real charges will be made
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Use Square sandbox test cards for testing
                          </p>
                        </div>
                      )}

                      {settings.squareMode === 'production' && (
                        <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                          <p className="text-sm text-success font-medium">
                            🚀 Production Mode Active - Real payments are enabled
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card variant="glass">
                    <CardHeader>
                      <CardTitle>
                        {settings.squareMode === 'sandbox' ? '🧪 Sandbox' : '🚀 Production'} Credentials
                      </CardTitle>
                      <CardDescription>
                        {settings.squareMode === 'sandbox'
                          ? 'Configure your Square sandbox credentials for development'
                          : 'Configure your Square production credentials for live payments'
                        }
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {settings.squareMode === 'sandbox' ? (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Sandbox Access Token</label>
                            <Input
                              type="password"
                              value={settings.squareSandboxAccessToken}
                              onChange={(e) => setSettings({ ...settings, squareSandboxAccessToken: e.target.value })}
                              placeholder="EAAAl..."
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Sandbox Application ID</label>
                            <Input
                              value={settings.squareSandboxApplicationId}
                              onChange={(e) => setSettings({ ...settings, squareSandboxApplicationId: e.target.value })}
                              placeholder="sandbox-sq0idb-..."
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Production Access Token</label>
                            <Input
                              type="password"
                              value={settings.squareProductionAccessToken}
                              onChange={(e) => setSettings({ ...settings, squareProductionAccessToken: e.target.value })}
                              placeholder="EAAAl..."
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Production Application ID</label>
                            <Input
                              value={settings.squareProductionApplicationId}
                              onChange={(e) => setSettings({ ...settings, squareProductionApplicationId: e.target.value })}
                              placeholder="sq0idp-..."
                            />
                          </div>
                        </>
                      )}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Location ID</label>
                        <Input
                          value={settings.squareLocationId}
                          onChange={(e) => setSettings({ ...settings, squareLocationId: e.target.value })}
                          placeholder="L..."
                        />
                        <p className="text-xs text-muted-foreground">
                          Find this in your Square Dashboard under Locations
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Webhook Signature Key</label>
                        <Input
                          type="password"
                          value={settings.squareWebhookSignatureKey}
                          onChange={(e) => setSettings({ ...settings, squareWebhookSignatureKey: e.target.value })}
                          placeholder="Your webhook signature key"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card variant="glass">
                    <CardHeader>
                      <CardTitle>Square Webhook Configuration</CardTitle>
                      <CardDescription>
                        Add this URL to your Square webhook settings
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="p-4 rounded-lg bg-neon-green/10 border border-neon-green/30">
                        <h4 className="font-medium mb-2">Webhook URL</h4>
                        <code className="text-sm bg-secondary px-2 py-1 rounded block break-all">
                          {typeof window !== 'undefined' ? window.location.origin : ''}/api/square/webhook
                        </code>
                        <p className="text-xs text-muted-foreground mt-2">
                          Events to subscribe to: payment.updated, subscription.created, subscription.updated, invoice.payment_made
                        </p>
                      </div>
                      <div className="p-4 mt-4 rounded-lg bg-neon-green/10 border border-neon-green/30">
                        <p className="text-sm text-neon-green font-medium">
                          ✅ Square supports one-time payments and subscriptions
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Users can purchase ranks or subscribe for monthly auto-renewal. Ranks are auto-assigned via webhooks.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Notification Types</CardTitle>
                <CardDescription>
                  Configure which notifications are enabled site-wide. Changes affect all users.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ToggleCard
                  checked={settings.notifications.emailNotifications}
                  onChange={(val) => updateNotification('emailNotifications', val)}
                  label="Email Notifications"
                  description="Master toggle for all email notifications"
                />

                <div className="border-t border-border pt-4 space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground">In-App Notification Types</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                      <div className="p-2 rounded-lg bg-neon-purple/20">
                        <MessageSquare className="w-4 h-4 text-neon-purple" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Forum Replies</span>
                          <input
                            type="checkbox"
                            checked={settings.notifications.forumReplies}
                            onChange={(e) => updateNotification('forumReplies', e.target.checked)}
                            className="w-4 h-4 accent-neon-cyan"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">When someone replies to a forum post</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                      <div className="p-2 rounded-lg bg-neon-cyan/20">
                        <UserPlus className="w-4 h-4 text-neon-cyan" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Friend Requests</span>
                          <input
                            type="checkbox"
                            checked={settings.notifications.friendRequests}
                            onChange={(e) => updateNotification('friendRequests', e.target.checked)}
                            className="w-4 h-4 accent-neon-cyan"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">New friend requests</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                      <div className="p-2 rounded-lg bg-neon-pink/20">
                        <Mail className="w-4 h-4 text-neon-pink" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Private Messages</span>
                          <input
                            type="checkbox"
                            checked={settings.notifications.privateMessages}
                            onChange={(e) => updateNotification('privateMessages', e.target.checked)}
                            className="w-4 h-4 accent-neon-cyan"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">New direct messages</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                      <div className="p-2 rounded-lg bg-neon-orange/20">
                        <Server className="w-4 h-4 text-neon-orange" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Server Updates</span>
                          <input
                            type="checkbox"
                            checked={settings.notifications.serverUpdates}
                            onChange={(e) => updateNotification('serverUpdates', e.target.checked)}
                            className="w-4 h-4 accent-neon-cyan"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Server status changes</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                      <div className="p-2 rounded-lg bg-warning/20">
                        <Bell className="w-4 h-4 text-warning" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Announcements</span>
                          <input
                            type="checkbox"
                            checked={settings.notifications.announcements}
                            onChange={(e) => updateNotification('announcements', e.target.checked)}
                            className="w-4 h-4 accent-neon-cyan"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Site-wide announcements</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                      <div className="p-2 rounded-lg bg-success/20">
                        <Heart className="w-4 h-4 text-success" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Donation Confirmations</span>
                          <input
                            type="checkbox"
                            checked={settings.notifications.donationConfirmations}
                            onChange={(e) => updateNotification('donationConfirmations', e.target.checked)}
                            className="w-4 h-4 accent-neon-cyan"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Donation receipts</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                      <div className="p-2 rounded-lg bg-neon-cyan/20">
                        <FileText className="w-4 h-4 text-neon-cyan" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Level Up</span>
                          <input
                            type="checkbox"
                            checked={settings.notifications.levelUpNotifications}
                            onChange={(e) => updateNotification('levelUpNotifications', e.target.checked)}
                            className="w-4 h-4 accent-neon-cyan"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">XP level achievements</p>
                      </div>
                    </div>
                  </div>
                </div>

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
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-neon-orange" />
                    Admin Email Notifications
                  </CardTitle>
                  <CardDescription>
                    Receive email alerts for important site events
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!settings.smtpHost && (
                    <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-warning" />
                        <p className="text-sm text-warning font-medium">
                          SMTP not configured
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Configure SMTP settings above to enable admin email notifications.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Admin Notification Email</label>
                    <Input
                      type="email"
                      value={settings.smtpAdminNotifyEmail}
                      onChange={(e) => setSettings({ ...settings, smtpAdminNotifyEmail: e.target.value })}
                      placeholder="admin@vonix.network"
                      disabled={!settings.smtpHost}
                    />
                    <p className="text-xs text-muted-foreground">
                      Email address to receive admin notifications. Defaults to From Email if not set.
                    </p>
                  </div>

                  <div className="border-t border-border pt-4 space-y-3">
                    <h4 className="text-sm font-medium">Notification Types</h4>

                    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                      <div className="p-2 rounded-lg bg-error/20">
                        <AlertTriangle className="w-4 h-4 text-error" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Error Alerts</span>
                          <input
                            type="checkbox"
                            checked={settings.smtpAdminNotifyErrors}
                            onChange={(e) => setSettings({ ...settings, smtpAdminNotifyErrors: e.target.checked })}
                            className="w-4 h-4 accent-neon-cyan"
                            disabled={!settings.smtpHost}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Receive emails when server errors occur (dev & production)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                      <div className="p-2 rounded-lg bg-success/20">
                        <Heart className="w-4 h-4 text-success" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Donation Alerts</span>
                          <input
                            type="checkbox"
                            checked={settings.smtpAdminNotifyDonations}
                            onChange={(e) => setSettings({ ...settings, smtpAdminNotifyDonations: e.target.checked })}
                            className="w-4 h-4 accent-neon-cyan"
                            disabled={!settings.smtpHost}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Receive emails when new donations are received
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                      <div className="p-2 rounded-lg bg-neon-purple/20">
                        <UserPlus className="w-4 h-4 text-neon-purple" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Registration Alerts</span>
                          <input
                            type="checkbox"
                            checked={settings.smtpAdminNotifyRegistrations}
                            onChange={(e) => setSettings({ ...settings, smtpAdminNotifyRegistrations: e.target.checked })}
                            className="w-4 h-4 accent-neon-cyan"
                            disabled={!settings.smtpHost}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Receive emails when new users register
                        </p>
                      </div>
                    </div>
                  </div>
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

          {/* Discord Settings */}
          {activeTab === 'discord' && (
            <>
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" style={{ color: '#5865F2' }} />
                    Discord Chat Bridge
                  </CardTitle>
                  <CardDescription>
                    Connect your Discord server to the website for live chat
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ToggleCard
                    checked={discordSettings.enabled}
                    onChange={(val) => setDiscordSettings({ ...discordSettings, enabled: val })}
                    label="Enable Discord Chat"
                    description="Show Discord chat widget on the website"
                  />

                  {discordSettings.enabled && (
                    <div className="p-4 rounded-lg border" style={{ background: 'rgba(88, 101, 242, 0.1)', borderColor: 'rgba(88, 101, 242, 0.3)' }}>
                      <p className="text-sm font-medium" style={{ color: '#5865F2' }}>
                        Discord chat is enabled
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Website users can send and receive messages from your Discord channel
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card variant="glass">
                <CardHeader>
                  <CardTitle>Webhook Configuration</CardTitle>
                  <CardDescription>
                    Configure the Discord webhook for sending messages from website to Discord
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Webhook URL</label>
                    <Input
                      type="password"
                      value={discordSettings.webhookUrl}
                      onChange={(e) => setDiscordSettings({ ...discordSettings, webhookUrl: e.target.value })}
                      placeholder="https://discord.com/api/webhooks/..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Create a webhook in Discord: Server Settings → Integrations → Webhooks
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Channel Name (Display)</label>
                    <Input
                      value={discordSettings.channelName}
                      onChange={(e) => setDiscordSettings({ ...discordSettings, channelName: e.target.value })}
                      placeholder="general"
                    />
                    <p className="text-xs text-muted-foreground">
                      Shown in the chat widget header (e.g., "#general")
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card variant="glass">
                <CardHeader>
                  <CardTitle>Bot Configuration</CardTitle>
                  <CardDescription>
                    Configure the Discord bot to receive messages from Discord to website
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30">
                    <p className="text-sm text-neon-cyan font-medium">
                      🤖 The Discord bot runs integrated with the website
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      It starts automatically when the server starts. After saving settings, restart the server for changes to take effect.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Bot Token</label>
                    <Input
                      type="password"
                      value={discordSettings.botToken}
                      onChange={(e) => setDiscordSettings({ ...discordSettings, botToken: e.target.value })}
                      placeholder="Your Discord bot token"
                    />
                    <p className="text-xs text-muted-foreground">
                      Get this from Discord Developer Portal → Your Application → Bot → Token
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Channel ID</label>
                    <Input
                      value={discordSettings.channelId}
                      onChange={(e) => setDiscordSettings({ ...discordSettings, channelId: e.target.value })}
                      placeholder="123456789012345678"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enable Developer Mode in Discord, right-click channel → Copy ID
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Client ID (Application ID)</label>
                    <Input
                      value={discordSettings.clientId}
                      onChange={(e) => setDiscordSettings({ ...discordSettings, clientId: e.target.value })}
                      placeholder="123456789012345678"
                    />
                    <p className="text-xs text-muted-foreground">
                      Required for slash commands. Get this from Discord Developer Portal → General Information → Application ID
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Guild ID (Server ID)</label>
                    <Input
                      value={discordSettings.guildId}
                      onChange={(e) => setDiscordSettings({ ...discordSettings, guildId: e.target.value })}
                      placeholder="123456789012345678"
                    />
                    <p className="text-xs text-muted-foreground">
                      Required for slash commands. Right-click your server icon → Copy ID
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5" style={{ color: '#5865F2' }} />
                    Discord OAuth2 Login
                  </CardTitle>
                  <CardDescription>
                    Allow users to sign in with their Discord account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ToggleCard
                    checked={discordSettings.oauthEnabled}
                    onChange={(val) => setDiscordSettings({ ...discordSettings, oauthEnabled: val })}
                    label="Enable Discord OAuth Login"
                    description="Allow users to link their Discord account and sign in with Discord"
                  />

                  {discordSettings.oauthEnabled && (
                    <>
                      <div className="p-4 rounded-lg border" style={{ background: 'rgba(88, 101, 242, 0.1)', borderColor: 'rgba(88, 101, 242, 0.3)' }}>
                        <p className="text-sm font-medium" style={{ color: '#5865F2' }}>
                          🔗 Discord OAuth is enabled
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Users can link their Discord account and use it to sign in
                        </p>
                      </div>

                      {/* Registration toggle */}
                      <ToggleCard
                        checked={discordSettings.oauthRegistrationEnabled}
                        onChange={(val) => setDiscordSettings({ ...discordSettings, oauthRegistrationEnabled: val })}
                        label="Allow Discord OAuth Registration"
                        description="When enabled, new users can register via Discord (they'll be asked for their Minecraft username). When disabled, only existing linked accounts can login via Discord."
                      />

                      {!discordSettings.oauthRegistrationEnabled && (
                        <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                          <p className="text-sm font-medium text-muted-foreground">
                            ℹ️ Registration via Discord is disabled
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            If &quot;Require Registration Code&quot; is disabled in Security settings, users can still register via Discord. Otherwise, they must register through the Minecraft server first.
                          </p>
                        </div>
                      )}

                      {discordSettings.oauthRegistrationEnabled && (
                        <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                          <p className="text-sm font-medium text-success">
                            ✓ Discord Registration is enabled
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            New users can register via Discord and will be asked for their Minecraft username during registration.
                          </p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Register Role ID (Optional)</label>
                        <Input
                          value={discordSettings.registerRoleId}
                          onChange={(e) => setDiscordSettings({ ...discordSettings, registerRoleId: e.target.value })}
                          placeholder="123456789012345678"
                        />
                        <p className="text-xs text-muted-foreground">
                          Discord role to assign when a user registers via Discord OAuth. Right-click a role in Discord → Copy ID.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">OAuth Client ID</label>
                        <Input
                          value={discordSettings.oauthClientId}
                          onChange={(e) => setDiscordSettings({ ...discordSettings, oauthClientId: e.target.value })}
                          placeholder="123456789012345678"
                        />
                        <p className="text-xs text-muted-foreground">
                          Discord Developer Portal → OAuth2 → Client ID
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">OAuth Client Secret</label>
                        <Input
                          type="password"
                          value={discordSettings.oauthClientSecret}
                          onChange={(e) => setDiscordSettings({ ...discordSettings, oauthClientSecret: e.target.value })}
                          placeholder="Your OAuth client secret"
                        />
                        <p className="text-xs text-muted-foreground">
                          Discord Developer Portal → OAuth2 → Client Secret (Reset to reveal)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">OAuth Redirect URI</label>
                        <Input
                          value={discordSettings.oauthRedirectUri || `${typeof window !== 'undefined' ? window.location.origin : ''}/api/auth/discord/callback`}
                          onChange={(e) => setDiscordSettings({ ...discordSettings, oauthRedirectUri: e.target.value })}
                          placeholder="https://yourdomain.com/api/auth/discord/callback"
                        />
                        <p className="text-xs text-muted-foreground">
                          Add this URL to Discord Developer Portal → OAuth2 → Redirects
                        </p>
                      </div>

                      <div className="p-4 rounded-lg bg-secondary/50">
                        <h4 className="font-medium mb-2">Setup Instructions</h4>
                        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                          <li>Go to <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="text-neon-cyan hover:underline">Discord Developer Portal</a></li>
                          <li>Select your application (or create one)</li>
                          <li>Go to OAuth2 → General</li>
                          <li>Copy the Client ID and Client Secret</li>
                          <li>Add the Redirect URI shown above to the Redirects list</li>
                        </ol>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-neon-cyan" />
                    Discord Ticket System
                  </CardTitle>
                  <CardDescription>
                    Configure Discord channels and roles for the ticket system
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30">
                    <p className="text-sm text-neon-cyan font-medium">
                      🎫 Discord Ticket Integration
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Website tickets will create Discord threads. Use /ticketcreator in Discord to create a ticket panel.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ticket Forum Channel ID</label>
                    <Input
                      value={discordSettings.ticketForumId}
                      onChange={(e) => setDiscordSettings({ ...discordSettings, ticketForumId: e.target.value })}
                      placeholder="123456789012345678"
                    />
                    <p className="text-xs text-muted-foreground">
                      Forum channel where ticket threads will be created
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ticket Category ID (for Discord channels)</label>
                    <Input
                      value={discordSettings.ticketCategoryId}
                      onChange={(e) => setDiscordSettings({ ...discordSettings, ticketCategoryId: e.target.value })}
                      placeholder="123456789012345678"
                    />
                    <p className="text-xs text-muted-foreground">
                      Discord category where ticket channels will be created (alternative to forum)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Staff Role ID</label>
                    <Input
                      value={discordSettings.ticketStaffRoleId}
                      onChange={(e) => setDiscordSettings({ ...discordSettings, ticketStaffRoleId: e.target.value })}
                      placeholder="123456789012345678"
                    />
                    <p className="text-xs text-muted-foreground">
                      Role that can view and respond to tickets
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ping Role ID (Optional)</label>
                    <Input
                      value={discordSettings.ticketPingRoleId}
                      onChange={(e) => setDiscordSettings({ ...discordSettings, ticketPingRoleId: e.target.value })}
                      placeholder="123456789012345678"
                    />
                    <p className="text-xs text-muted-foreground">
                      Role to ping when a new ticket is created (leave empty to not ping)
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="w-5 h-5 text-neon-orange" />
                    Minecraft Server Channel (Optional)
                  </CardTitle>
                  <CardDescription>
                    Configure a second channel to monitor for Minecraft server embeds (Viscord messages)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-neon-orange/10 border border-neon-orange/30">
                    <p className="text-sm text-neon-orange font-medium">
                      🎮 Optional: Monitor a second Discord channel
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Use this to display Viscord-style embeds (player joins/leaves, advancements, etc.) from your Minecraft server.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Viscord Channel ID</label>
                    <Input
                      value={discordSettings.viscordChannelId}
                      onChange={(e) => setDiscordSettings({ ...discordSettings, viscordChannelId: e.target.value })}
                      placeholder="123456789012345678"
                    />
                    <p className="text-xs text-muted-foreground">
                      The Discord channel where your Minecraft server sends embeds
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Viscord Channel Name (Display)</label>
                    <Input
                      value={discordSettings.viscordChannelName}
                      onChange={(e) => setDiscordSettings({ ...discordSettings, viscordChannelName: e.target.value })}
                      placeholder="server-activity"
                    />
                    <p className="text-xs text-muted-foreground">
                      Shown in the chat widget (e.g., &quot;#server-activity&quot;)
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-neon-green" />
                    Donation Events Webhook (Optional)
                  </CardTitle>
                  <CardDescription>
                    Send detailed donation announcements to a Discord channel
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-neon-green/10 border border-neon-green/30">
                    <p className="text-sm text-neon-green font-medium">
                      💰 Optional: Announce donations to Discord
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      When configured, successful donations will send a rich embed to this webhook with the donor&apos;s Minecraft avatar and donation details.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Donation Webhook URL</label>
                    <Input
                      type="password"
                      value={discordSettings.donationWebhookUrl}
                      onChange={(e) => setDiscordSettings({ ...discordSettings, donationWebhookUrl: e.target.value })}
                      placeholder="https://discord.com/api/webhooks/..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Create a webhook in your donation announcements channel: Server Settings → Integrations → Webhooks
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Webhook Avatar URL (Optional)</label>
                    <Input
                      value={discordSettings.donationWebhookAvatarUrl}
                      onChange={(e) => setDiscordSettings({ ...discordSettings, donationWebhookAvatarUrl: e.target.value })}
                      placeholder="https://example.com/bot-avatar.png"
                    />
                    <p className="text-xs text-muted-foreground">
                      Custom avatar for the webhook bot. Leave empty to use the default webhook avatar.
                    </p>
                  </div>

                  {/* Test Donation Embed Buttons */}
                  <div className="pt-4 border-t border-border">
                    <label className="text-sm font-medium block mb-3">Test Donation Embeds</label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Send a test donation embed to verify your webhook configuration.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="neon-outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/admin/test-donation-embed', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ includeRank: false }),
                            });
                            const data = await res.json();
                            if (res.ok && data.success) {
                              toast.success('Test donation sent (without rank)!');
                            } else {
                              toast.error(data.error || 'Failed to send test embed');
                            }
                          } catch {
                            toast.error('Failed to send test embed');
                          }
                        }}
                        disabled={!discordSettings.donationWebhookUrl}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Test (No Rank)
                      </Button>
                      <Button
                        variant="neon-outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/admin/test-donation-embed', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ includeRank: true }),
                            });
                            const data = await res.json();
                            if (res.ok && data.success) {
                              toast.success('Test donation sent (with rank)!');
                            } else {
                              toast.error(data.error || 'Failed to send test embed');
                            }
                          } catch {
                            toast.error('Failed to send test embed');
                          }
                        }}
                        disabled={!discordSettings.donationWebhookUrl}
                      >
                        <Heart className="w-4 h-4 mr-2" />
                        Test (With Rank)
                      </Button>
                    </div>
                    {!discordSettings.donationWebhookUrl && (
                      <p className="text-xs text-warning mt-2">
                        ⚠️ Save a Donation Webhook URL first to enable testing
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Button
                variant="gradient"
                onClick={async () => {
                  setDiscordSaving(true);
                  try {
                    const res = await fetch('/api/discord-chat/settings', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(discordSettings),
                    });
                    if (res.ok) {
                      toast.success('Discord settings saved');
                    } else {
                      toast.error('Failed to save Discord settings');
                    }
                  } catch (err: any) {
                    toast.error('Failed to save Discord settings');
                  } finally {
                    setDiscordSaving(false);
                  }
                }}
                disabled={discordSaving}
                className="w-full"
              >
                {discordSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving Discord Settings...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Discord Settings
                  </>
                )}
              </Button>
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

