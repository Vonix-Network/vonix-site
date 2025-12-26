'use client';

import { useState, useEffect } from 'react';
import {
  Shield, AlertTriangle, Ban, Eye,
  MessageSquare, Clock, CheckCircle, XCircle,
  Loader2, X, Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatRelativeTime, getMinecraftAvatarUrl, getInitials } from '@/lib/utils';
import { toast } from 'sonner';

interface Report {
  id: number;
  contentType: string;
  contentId: number;
  reporterId: number;
  reporterUsername?: string;
  reason: string;
  description: string | null;
  status: string;
  createdAt: Date;
  targetUsername?: string;
}

interface AuditLog {
  id: number;
  userId: number | null;
  action: string;
  resource: string;
  resourceId: string | null;
  details: string | null;
  createdAt: Date;
  username?: string;
}

interface ModerationStats {
  bannedUsers: number;
  lockedPosts: number;
  pendingReports: number;
  recentActions: number;
}

export default function AdminModerationPage() {
  const [stats, setStats] = useState<ModerationStats>({
    bannedUsers: 0,
    lockedPosts: 0,
    pendingReports: 0,
    recentActions: 0,
  });
  const [reports, setReports] = useState<Report[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [showBanModal, setShowBanModal] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showIpBanModal, setShowIpBanModal] = useState(false);

  // Form states
  const [banUsername, setBanUsername] = useState('');
  const [banReason, setBanReason] = useState('');
  const [lockPostId, setLockPostId] = useState('');
  const [lockReason, setLockReason] = useState('');
  const [ipToBan, setIpToBan] = useState('');
  const [ipBanReason, setIpBanReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchModerationData();
  }, []);

  const fetchModerationData = async () => {
    try {
      const res = await fetch('/api/admin/moderation');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setReports(data.reports || []);
        setAuditLogs(data.auditLogs || []);
      }
    } catch (error: any) {
      console.error('Failed to fetch moderation data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBanUser = async () => {
    if (!banUsername) {
      toast.error('Please enter a username');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/moderation/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: banUsername, reason: banReason }),
      });

      if (res.ok) {
        toast.success(`User "${banUsername}" has been banned`);
        setShowBanModal(false);
        setBanUsername('');
        setBanReason('');
        fetchModerationData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to ban user');
      }
    } catch (error: any) {
      toast.error('Failed to ban user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLockPost = async () => {
    if (!lockPostId) {
      toast.error('Please enter a post ID');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/moderation/lock-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: parseInt(lockPostId), reason: lockReason }),
      });

      if (res.ok) {
        toast.success('Post has been locked');
        setShowLockModal(false);
        setLockPostId('');
        setLockReason('');
        fetchModerationData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to lock post');
      }
    } catch (error: any) {
      toast.error('Failed to lock post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveReport = async (reportId: number, action: 'reviewed' | 'dismissed' | 'actioned') => {
    try {
      const res = await fetch(`/api/admin/moderation/reports/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      });

      if (res.ok) {
        toast.success(`Report ${action}`);
        fetchModerationData();
      } else {
        toast.error('Failed to update report');
      }
    } catch (error: any) {
      toast.error('Failed to update report');
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
      <div>
        <h1 className="text-3xl font-bold gradient-text mb-2">Moderation</h1>
        <p className="text-muted-foreground">
          Manage reports, bans, and content moderation
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-error/10">
                <Ban className="w-5 h-5 text-error" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.bannedUsers}</p>
                <p className="text-sm text-muted-foreground">Banned Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{reports.length}</p>
                <p className="text-sm text-muted-foreground">Pending Reports</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-neon-purple/10">
                <MessageSquare className="w-5 h-5 text-neon-purple" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.lockedPosts}</p>
                <p className="text-sm text-muted-foreground">Locked Posts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-neon-cyan/10">
                <Shield className="w-5 h-5 text-neon-cyan" />
              </div>
              <div>
                <p className="text-2xl font-bold">{auditLogs.length}</p>
                <p className="text-sm text-muted-foreground">Recent Actions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Reports */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Pending Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reports.length > 0 ? (
              <div className="space-y-3">
                {reports.map((report: any) => (
                  <div
                    key={report.id}
                    className="p-4 rounded-lg bg-secondary/50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <Badge variant={report.contentType === 'user' ? 'error' : 'warning'}>
                          {report.contentType}
                        </Badge>
                        <p className="font-medium mt-2">{report.reason}</p>
                        {report.description && (
                          <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(report.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Content ID: <strong>{report.contentId}</strong></span>
                      <span>Reporter ID: {report.reporterId}</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="neon"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleResolveReport(report.id, 'actioned')}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Action
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResolveReport(report.id, 'reviewed')}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Review
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-error"
                        onClick={() => handleResolveReport(report.id, 'dismissed')}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No pending reports</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Audit Logs */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-neon-cyan" />
              Recent Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {auditLogs.length > 0 ? (
              <div className="space-y-3">
                {auditLogs.slice(0, 10).map((log: any) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50"
                  >
                    <div className="p-2 rounded-lg bg-neon-purple/10">
                      <Shield className="w-4 h-4 text-neon-purple" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{log.action}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {log.resource}: {log.resourceId}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatRelativeTime(log.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No recent actions</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card variant="gradient">
        <CardContent className="py-6">
          <h3 className="font-bold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="glass"
              className="h-auto py-4 flex-col"
              onClick={() => setShowBanModal(true)}
            >
              <Ban className="w-6 h-6 mb-2" />
              <span>Ban User</span>
            </Button>
            <Button
              variant="glass"
              className="h-auto py-4 flex-col"
              onClick={() => setShowLockModal(true)}
            >
              <MessageSquare className="w-6 h-6 mb-2" />
              <span>Lock Post</span>
            </Button>
            <Button
              variant="glass"
              className="h-auto py-4 flex-col"
              onClick={() => setShowLogsModal(true)}
            >
              <Eye className="w-6 h-6 mb-2" />
              <span>View Logs</span>
            </Button>
            <Button
              variant="glass"
              className="h-auto py-4 flex-col"
              onClick={() => setShowIpBanModal(true)}
            >
              <Shield className="w-6 h-6 mb-2" />
              <span>IP Ban</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ban User Modal */}
      {showBanModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Ban className="w-5 h-5 text-error" /> Ban User
                </span>
                <Button variant="ghost" size="icon" onClick={() => setShowBanModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Username *</label>
                <Input
                  value={banUsername}
                  onChange={(e) => setBanUsername(e.target.value)}
                  placeholder="Enter username to ban"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason</label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Reason for ban..."
                  className="w-full min-h-[80px] px-3 py-2 rounded-lg bg-secondary/50 border border-border focus:outline-none focus:ring-2 focus:ring-neon-cyan"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowBanModal(false)}>Cancel</Button>
                <Button variant="neon" onClick={handleBanUser} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Ban className="w-4 h-4 mr-2" />}
                  Ban User
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lock Post Modal */}
      {showLockModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-warning" /> Lock Post
                </span>
                <Button variant="ghost" size="icon" onClick={() => setShowLockModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Post ID *</label>
                <Input
                  type="number"
                  value={lockPostId}
                  onChange={(e) => setLockPostId(e.target.value)}
                  placeholder="Enter post ID"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason</label>
                <textarea
                  value={lockReason}
                  onChange={(e) => setLockReason(e.target.value)}
                  placeholder="Reason for locking..."
                  className="w-full min-h-[80px] px-3 py-2 rounded-lg bg-secondary/50 border border-border focus:outline-none focus:ring-2 focus:ring-neon-cyan"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowLockModal(false)}>Cancel</Button>
                <Button variant="neon" onClick={handleLockPost} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageSquare className="w-4 h-4 mr-2" />}
                  Lock Post
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View Logs Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-neon-cyan" /> Audit Logs
                </span>
                <Button variant="ghost" size="icon" onClick={() => setShowLogsModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-y-auto flex-1">
              <div className="space-y-2">
                {auditLogs.map((log: any) => (
                  <div key={log.id} className="p-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{log.action}</Badge>
                      <span className="text-xs text-muted-foreground">{formatRelativeTime(log.createdAt)}</span>
                    </div>
                    <p className="text-sm mt-2">{log.resource}: {log.resourceId}</p>
                    {log.details && (
                      <p className="text-xs text-muted-foreground mt-1">{log.details}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* IP Ban Modal */}
      {showIpBanModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-error" /> IP Ban
                </span>
                <Button variant="ghost" size="icon" onClick={() => setShowIpBanModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">IP Address *</label>
                <Input
                  value={ipToBan}
                  onChange={(e) => setIpToBan(e.target.value)}
                  placeholder="e.g., 192.168.1.1"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason</label>
                <textarea
                  value={ipBanReason}
                  onChange={(e) => setIpBanReason(e.target.value)}
                  placeholder="Reason for IP ban..."
                  className="w-full min-h-[80px] px-3 py-2 rounded-lg bg-secondary/50 border border-border focus:outline-none focus:ring-2 focus:ring-neon-cyan"
                />
              </div>
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
                <p className="text-sm text-warning">
                  ⚠️ IP bans affect all accounts from this address. Use with caution.
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowIpBanModal(false)}>Cancel</Button>
                <Button variant="neon" disabled>
                  <Shield className="w-4 h-4 mr-2" />
                  Ban IP (Coming Soon)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

