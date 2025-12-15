'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  User, Shield, Bell, Palette, Key, CreditCard, Gamepad2,
  Save, Loader2, Eye, EyeOff, Check, Crown, ExternalLink, AlertTriangle, Calendar, History, Link2, Unlink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getMinecraftAvatarUrl, getUserAvatarUrl, getInitials } from '@/lib/utils';
import { MinecraftSkinViewer } from '@/components/minecraft-skin-viewer';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'subscription', label: 'Subscription', icon: CreditCard },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'avatar', label: 'Avatar', icon: Gamepad2 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

interface SubscriptionData {
  hasRank: boolean;
  rank: {
    id: string;
    name: string;
    color: string;
    icon: string | null;
    badge: string | null;
  } | null;
  expiresAt: string | null;
  isExpired: boolean;
  hasSubscription: boolean;
  subscriptionProvider: 'stripe' | 'square' | null;
  subscriptionStatus: string | null;
  totalDonated: number;
  stripeStatus: string | null;
  squareStatus: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}

export default function SettingsPage() {
  const { data: session, update, status } = useSession();
  const router = useRouter();
  const user = session?.user as any;

  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saved, setSaved] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/settings');
    }
  }, [status, router]);

  // Form states
  const [profile, setProfile] = useState({
    bio: user?.bio || '',
    email: user?.email || '',
    avatar: (user as any)?.avatar || '',
  });

  const [security, setSecurity] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    forumReplies: true,
    socialMentions: true,
    friendRequests: true,
    serverUpdates: true,
  });

  // Avatar/Skin viewer settings
  const [avatarSettings, setAvatarSettings] = useState({
    animation: 'walking' as 'walking' | 'running' | 'idle' | 'none',
    autoRotate: true,
    rotateSpeed: 0.5,
    zoom: 0.9,
    animationSpeed: 1,
    showNameTag: false,
  });
  const [savingAvatarSettings, setSavingAvatarSettings] = useState(false);
  const [avatarSaved, setAvatarSaved] = useState(false);

  // Subscription state
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [managingSubscription, setManagingSubscription] = useState(false);
  const [donations, setDonations] = useState<{
    id: number;
    amount: number;
    currency: string;
    method: string | null;
    paymentType: string | null;
    rankId: string | null;
    days: number | null;
    createdAt: string;
    message: string | null;
  }[]>([]);
  const [loadingDonations, setLoadingDonations] = useState(false);

  // When the session/user finishes loading, hydrate the profile form
  // so that inputs show the current saved values instead of staying empty.
  useEffect(() => {
    if (!user) return;

    setProfile((prev) => ({
      bio: prev.bio || user.bio || '',
      email: prev.email || user.email || '',
      avatar: prev.avatar || (user as any).avatar || '',
    }));
  }, [user]);

  // Fetch subscription data when tab is active
  useEffect(() => {
    if (activeTab === 'subscription' && !subscription && !loadingSubscription) {
      fetchSubscription();
      fetchDonations();
    }
  }, [activeTab]);

  const fetchSubscription = async () => {
    setLoadingSubscription(true);
    try {
      const res = await fetch('/api/user/subscription');
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
    } finally {
      setLoadingSubscription(false);
    }
  };

  const fetchDonations = async () => {
    setLoadingDonations(true);
    try {
      const res = await fetch('/api/user/donations');
      if (res.ok) {
        const data = await res.json();
        setDonations(data.donations || []);
      }
    } catch (err) {
      console.error('Error fetching donations:', err);
    } finally {
      setLoadingDonations(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!subscription?.subscriptionProvider) return;

    setManagingSubscription(true);
    try {
      if (subscription.subscriptionProvider === 'stripe') {
        // Redirect to Stripe portal
        const res = await fetch('/api/stripe/portal', {
          method: 'POST',
        });
        if (res.ok) {
          const data = await res.json();
          window.location.href = data.url;
        } else {
          console.error('Failed to create portal session');
        }
      } else if (subscription.subscriptionProvider === 'square') {
        // Cancel Square subscription directly
        if (!confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your current billing period.')) {
          setManagingSubscription(false);
          return;
        }

        const res = await fetch('/api/square/cancel-subscription', {
          method: 'POST',
        });

        if (res.ok) {
          alert('Subscription canceled successfully.');
          // Refresh subscription data
          await fetchSubscription();
        } else {
          const data = await res.json();
          alert(`Failed to cancel subscription: ${data.error || 'Unknown error'}`);
        }
      }
    } catch (err) {
      console.error('Error managing subscription:', err);
      alert('An error occurred. Please try again.');
    } finally {
      setManagingSubscription(false);
    }
  };

  const handleResetAvatar = async () => {
    if (!user?.id) return;

    try {
      setIsSaving(true);

      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avatar: null }),
      });

      if (!res.ok) {
        console.error('Failed to reset avatar', await res.text());
        throw new Error('Failed to reset avatar');
      }

      const updated = await res.json();

      // Clear avatar in local form state
      setProfile((prev) => ({ ...prev, avatar: '' }));

      // Update session so navbar and other components see the default avatar
      if (session) {
        await update({
          ...session,
          user: {
            ...(session.user as any),
            avatar: updated.avatar ?? null,
          },
        } as any);
      }

      setIsSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Error resetting avatar:', err);
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    try {
      setIsSaving(true);

      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bio: profile.bio,
          email: profile.email,
          avatar: profile.avatar?.trim() || null,
        }),
      });

      if (!res.ok) {
        console.error('Failed to save profile settings', await res.text());
        throw new Error('Failed to save');
      }

      const updated = await res.json();

      // Update session so navbar and other components see the new avatar/email
      if (session) {
        await update({
          ...session,
          user: {
            ...(session.user as any),
            email: updated.email ?? (session.user as any).email,
            bio: updated.bio ?? (session.user as any).bio,
            avatar: updated.avatar ?? (session.user as any).avatar,
          },
        } as any);
      }

      setIsSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError('');
    setPasswordSuccess(false);

    // Validation
    if (!security.currentPassword || !security.newPassword || !security.confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (security.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }

    if (security.newPassword !== security.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: security.currentPassword,
          newPassword: security.newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setPasswordSuccess(true);
        setSecurity({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => setPasswordSuccess(false), 3000);
      } else {
        setPasswordError(data.error || 'Failed to change password');
      }
    } catch (err) {
      setPasswordError('Something went wrong');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="md:col-span-1">
          <Card variant="glass">
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
        </div>

        {/* Content */}
        <div className="md:col-span-3">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>
                  Update your profile information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center gap-6">
                  <Avatar className="w-20 h-20" glow>
                    <AvatarImage
                      src={getUserAvatarUrl(
                        user?.minecraftUsername || user?.username || '',
                        profile.avatar || (user as any)?.avatar
                      )}
                      alt={user?.username}
                    />
                    <AvatarFallback className="text-xl">
                      {getInitials(user?.username || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">{user?.username}</h3>
                    <p className="text-sm text-muted-foreground">
                      Avatar from Minecraft by default. You can override it with a custom URL below.
                    </p>
                    {user?.minecraftUsername && (
                      <Badge variant="neon" className="mt-2">
                        {user.minecraftUsername}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Custom Avatar URL */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Custom Avatar URL</label>
                  <div className="flex gap-2">
                    <Input
                      type="url"
                      value={profile.avatar}
                      onChange={(e) => setProfile({ ...profile, avatar: e.target.value })}
                      placeholder="https://example.com/avatar.png"
                    />
                    {(profile.avatar || (user as any)?.avatar) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleResetAvatar}
                        disabled={isSaving}
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Optional. If set, this URL will be used instead of the Minecraft avatar.
                  </p>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <Input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    placeholder="your@email.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for account recovery and notifications
                  </p>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Bio</label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    className="w-full bg-secondary/50 border border-border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 min-h-[100px]"
                    maxLength={200}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {profile.bio.length}/200
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Subscription Tab */}
          {activeTab === 'subscription' && (
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-neon-purple" />
                  Subscription & Rank
                </CardTitle>
                <CardDescription>
                  Manage your donation rank and subscription billing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {loadingSubscription ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-neon-cyan" />
                  </div>
                ) : subscription ? (
                  <>
                    {/* Current Rank Status */}
                    <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                      <h3 className="font-semibold mb-3">Current Rank</h3>
                      {subscription.hasRank && subscription.rank ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{subscription.rank.icon || '👤'}</span>
                            <div>
                              <p
                                className="font-bold text-lg"
                                style={{ color: subscription.rank.color }}
                              >
                                {subscription.rank.name}
                              </p>
                              {subscription.rank.badge && (
                                <Badge variant="outline" style={{ borderColor: subscription.rank.color, color: subscription.rank.color }}>
                                  {subscription.rank.badge}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {subscription.expiresAt && (
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {subscription.isExpired ? 'Expired' : 'Expires'}:{' '}
                                <span className={subscription.isExpired ? 'text-red-400' : 'text-foreground'}>
                                  {new Date(subscription.expiresAt).toLocaleDateString('en-US', {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </span>
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-muted-foreground">
                          <p>You don&apos;t have an active rank.</p>
                          <Button
                            variant="neon"
                            size="sm"
                            className="mt-3"
                            onClick={() => window.location.href = '/donate'}
                          >
                            Get a Rank
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Subscription Status */}
                    <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                      <h3 className="font-semibold mb-3">Auto-Renewal</h3>
                      {subscription.hasSubscription ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={subscription.subscriptionStatus === 'active' ? 'default' : 'destructive'}
                              className={subscription.subscriptionStatus === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''}
                            >
                              {subscription.cancelAtPeriodEnd ? 'Canceling' : (subscription.subscriptionStatus || 'unknown')}
                            </Badge>
                            {subscription.cancelAtPeriodEnd && (
                              <span className="text-sm text-yellow-400 flex items-center gap-1">
                                <AlertTriangle className="w-4 h-4" />
                                Will not renew
                              </span>
                            )}
                          </div>

                          {subscription.currentPeriodEnd && !subscription.cancelAtPeriodEnd && (
                            <p className="text-sm text-muted-foreground">
                              Next billing date:{' '}
                              <span className="text-foreground">
                                {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
                                  month: 'long',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                            </p>
                          )}

                          <Button
                            variant="outline"
                            onClick={handleManageSubscription}
                            disabled={managingSubscription}
                            className="w-full sm:w-auto"
                          >
                            {managingSubscription ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <ExternalLink className="w-4 h-4 mr-2" />
                            )}
                            {subscription.cancelAtPeriodEnd ? 'Reactivate Subscription' : 'Manage Subscription'}
                          </Button>

                          <p className="text-xs text-muted-foreground">
                            {subscription.subscriptionProvider === 'stripe'
                              ? 'You can cancel auto-renewal, update payment method, or view billing history through the Stripe portal.'
                              : 'Click to cancel your Square subscription. You will retain access until the end of your billing period.'}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-muted-foreground">
                            {subscription.hasRank
                              ? 'You have a one-time rank purchase. Enable auto-renewal to never lose your rank!'
                              : 'Subscribe to a rank to get automatic monthly renewals.'}
                          </p>
                          <Button
                            variant="neon-outline"
                            size="sm"
                            onClick={() => window.location.href = '/donate'}
                          >
                            {subscription.hasRank ? 'Enable Auto-Renewal' : 'View Ranks'}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Total Donated */}
                    <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                      <h3 className="font-semibold mb-2">Total Contributed</h3>
                      <p className="text-2xl font-bold text-neon-cyan">
                        ${subscription.totalDonated.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Thank you for supporting the server!
                      </p>
                    </div>

                    {/* Donation History */}
                    <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <History className="w-4 h-4" />
                        Donation History
                      </h3>
                      {loadingDonations ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : donations.length > 0 ? (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                          {donations.map((donation) => (
                            <div
                              key={donation.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-neon-green">
                                    ${donation.amount.toFixed(2)}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {donation.method || 'unknown'}
                                  </Badge>
                                  {donation.paymentType === 'subscription' && (
                                    <Badge variant="outline" className="text-xs bg-neon-purple/10 border-neon-purple/30 text-neon-purple">
                                      Subscription
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(donation.createdAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                  {donation.days && donation.days > 0 && (
                                    <span> · {donation.days} days</span>
                                  )}
                                  {donation.message && (
                                    <span className="block text-foreground/70 mt-0.5">{donation.message}</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No donation history yet.
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Unable to load subscription data.</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={fetchSubscription}>
                      Retry
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage your password and security options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Change Password */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    Change Password
                  </h3>

                  {passwordError && (
                    <div className="p-3 rounded-lg bg-error/10 border border-error/50 text-error text-sm">
                      {passwordError}
                    </div>
                  )}

                  {passwordSuccess && (
                    <div className="p-3 rounded-lg bg-success/10 border border-success/50 text-success text-sm flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Password updated successfully!
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Current Password</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={security.currentPassword}
                        onChange={(e) => setSecurity({ ...security, currentPassword: e.target.value })}
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">New Password</label>
                    <Input
                      type="password"
                      value={security.newPassword}
                      onChange={(e) => setSecurity({ ...security, newPassword: e.target.value })}
                      placeholder="Enter new password (min 8 characters)"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Confirm New Password</label>
                    <Input
                      type="password"
                      value={security.confirmPassword}
                      onChange={(e) => setSecurity({ ...security, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                    />
                  </div>

                  <Button
                    variant="neon"
                    onClick={handlePasswordChange}
                    disabled={savingPassword || !security.currentPassword || !security.newPassword || !security.confirmPassword}
                  >
                    {savingPassword ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4 mr-2" />
                        Update Password
                      </>
                    )}
                  </Button>
                </div>

                {/* Two-Factor Auth */}
                <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Two-Factor Authentication</h3>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <Button variant="neon-outline">Enable 2FA</Button>
                  </div>
                </div>

                {/* Discord Account Linking */}
                <div className="p-4 rounded-lg border" style={{ background: 'rgba(88, 101, 242, 0.1)', borderColor: 'rgba(88, 101, 242, 0.3)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#5865F2' }}>
                        <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold">Discord Account</h3>
                        {user?.discordUsername ? (
                          <p className="text-sm text-muted-foreground">
                            Linked to <span style={{ color: '#5865F2' }}>@{user.discordUsername}</span>
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Link your Discord to login with Discord
                          </p>
                        )}
                      </div>
                    </div>
                    {user?.discordId ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" style={{ borderColor: '#5865F2', color: '#5865F2' }}>
                          <Link2 className="w-3 h-3 mr-1" />
                          Linked
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (!confirm('Are you sure you want to unlink your Discord account?')) return;
                            try {
                              const res = await fetch('/api/users/me', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  discordId: null,
                                  discordUsername: null,
                                  discordAvatar: null,
                                }),
                              });
                              if (res.ok) {
                                window.location.reload();
                              }
                            } catch (err) {
                              console.error('Failed to unlink Discord:', err);
                            }
                          }}
                          className="text-error hover:text-error/80"
                        >
                          <Unlink className="w-4 h-4 mr-1" />
                          Unlink
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => signIn('discord', { callbackUrl: '/settings' })}
                        style={{ borderColor: '#5865F2', color: '#5865F2' }}
                      >
                        <Link2 className="w-4 h-4 mr-2" />
                        Link Discord
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose what notifications you want to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries({
                  emailNotifications: 'Email Notifications',
                  forumReplies: 'Forum Replies',
                  socialMentions: 'Social Mentions',
                  friendRequests: 'Friend Requests',
                  serverUpdates: 'Server Updates',
                }).map(([key, label]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary/50"
                  >
                    <span className="font-medium">{label}</span>
                    <button
                      onClick={() => setNotifications({
                        ...notifications,
                        [key]: !notifications[key as keyof typeof notifications]
                      })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${notifications[key as keyof typeof notifications]
                        ? 'bg-neon-cyan'
                        : 'bg-secondary'
                        }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${notifications[key as keyof typeof notifications]
                          ? 'translate-x-7'
                          : 'translate-x-1'
                          }`}
                      />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Avatar Tab */}
          {activeTab === 'avatar' && (
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-neon-cyan" />
                  Avatar Settings
                </CardTitle>
                <CardDescription>
                  Customize how your 3D avatar appears on your profile page
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Preview Section */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Live Preview</h3>
                    <div className="bg-secondary/30 rounded-lg p-4">
                      {user?.minecraftUsername ? (
                        <MinecraftSkinViewer
                          username={user.minecraftUsername}
                          uuid={user.minecraftUuid}
                        />
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <Gamepad2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No Minecraft username set</p>
                          <p className="text-sm mt-2">
                            Add your Minecraft username in the Profile tab to see your 3D skin
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Controls Section */}
                  <div className="space-y-6">
                    <h3 className="font-semibold">Display Settings</h3>

                    {/* Animation Type */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Animation</label>
                      <select
                        value={avatarSettings.animation}
                        onChange={(e) => setAvatarSettings({ ...avatarSettings, animation: e.target.value as any })}
                        className="w-full h-10 px-3 rounded-md border border-border bg-secondary/50 text-foreground"
                      >
                        <option value="walking">Walking</option>
                        <option value="running">Running</option>
                        <option value="idle">Idle</option>
                        <option value="none">None (Static)</option>
                      </select>
                    </div>

                    {/* Animation Speed */}
                    {avatarSettings.animation !== 'none' && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Animation Speed: {avatarSettings.animationSpeed.toFixed(1)}x
                        </label>
                        <input
                          type="range"
                          min="0.1"
                          max="3"
                          step="0.1"
                          value={avatarSettings.animationSpeed}
                          onChange={(e) => setAvatarSettings({ ...avatarSettings, animationSpeed: parseFloat(e.target.value) })}
                          className="w-full accent-neon-cyan"
                        />
                      </div>
                    )}

                    {/* Auto Rotate */}
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Auto Rotate</label>
                      <button
                        type="button"
                        onClick={() => setAvatarSettings({ ...avatarSettings, autoRotate: !avatarSettings.autoRotate })}
                        className={`w-12 h-6 rounded-full transition-colors ${avatarSettings.autoRotate ? 'bg-neon-cyan' : 'bg-secondary'
                          }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${avatarSettings.autoRotate ? 'translate-x-6' : 'translate-x-0.5'
                          }`} />
                      </button>
                    </div>

                    {/* Rotate Speed */}
                    {avatarSettings.autoRotate && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Rotate Speed: {avatarSettings.rotateSpeed.toFixed(1)}
                        </label>
                        <input
                          type="range"
                          min="0.1"
                          max="2"
                          step="0.1"
                          value={avatarSettings.rotateSpeed}
                          onChange={(e) => setAvatarSettings({ ...avatarSettings, rotateSpeed: parseFloat(e.target.value) })}
                          className="w-full accent-neon-cyan"
                        />
                      </div>
                    )}

                    {/* Zoom */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Zoom: {avatarSettings.zoom.toFixed(1)}x
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={avatarSettings.zoom}
                        onChange={(e) => setAvatarSettings({ ...avatarSettings, zoom: parseFloat(e.target.value) })}
                        className="w-full accent-neon-cyan"
                      />
                    </div>

                    {/* Show Name Tag */}
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Show Name Tag</label>
                      <button
                        type="button"
                        onClick={() => setAvatarSettings({ ...avatarSettings, showNameTag: !avatarSettings.showNameTag })}
                        className={`w-12 h-6 rounded-full transition-colors ${avatarSettings.showNameTag ? 'bg-neon-cyan' : 'bg-secondary'
                          }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${avatarSettings.showNameTag ? 'translate-x-6' : 'translate-x-0.5'
                          }`} />
                      </button>
                    </div>

                    {/* Save Button */}
                    <Button
                      variant="gradient"
                      className="w-full mt-4"
                      onClick={async () => {
                        setSavingAvatarSettings(true);
                        try {
                          const res = await fetch('/api/users/me', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              avatarAnimation: avatarSettings.animation,
                              avatarAutoRotate: avatarSettings.autoRotate,
                              avatarRotateSpeed: avatarSettings.rotateSpeed,
                              avatarZoom: avatarSettings.zoom,
                              avatarAnimationSpeed: avatarSettings.animationSpeed,
                              avatarShowNameTag: avatarSettings.showNameTag,
                            }),
                          });
                          if (res.ok) {
                            setAvatarSaved(true);
                            setTimeout(() => setAvatarSaved(false), 2000);
                          }
                        } catch (err) {
                          console.error('Failed to save avatar settings:', err);
                        } finally {
                          setSavingAvatarSettings(false);
                        }
                      }}
                      disabled={savingAvatarSettings}
                    >
                      {savingAvatarSettings ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : avatarSaved ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Saved!
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Avatar Settings
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Appearance Settings</CardTitle>
                <CardDescription>
                  Customize how the site looks for you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Theme</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {['dark', 'light', 'system'].map((theme) => (
                      <button
                        key={theme}
                        className={`p-4 rounded-lg border-2 transition-colors ${theme === 'dark'
                          ? 'border-neon-cyan bg-neon-cyan/10'
                          : 'border-border hover:border-neon-cyan/50'
                          }`}
                      >
                        <div className={`w-full h-12 rounded mb-2 ${theme === 'dark' ? 'bg-gray-900' :
                          theme === 'light' ? 'bg-gray-100' :
                            'bg-gradient-to-r from-gray-900 to-gray-100'
                          }`} />
                        <span className="text-sm capitalize">{theme}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Save Button */}
          <div className="mt-6 flex justify-end">
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
        </div>
      </div>
    </div>
  );
}

