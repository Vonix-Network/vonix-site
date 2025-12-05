import { db } from '@/db';
import { users, forumPosts, auditLogs } from '@/db/schema';
import { desc, sql, eq } from 'drizzle-orm';
import { 
  Shield, AlertTriangle, Ban, Eye, 
  MessageSquare, Clock, CheckCircle, XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatRelativeTime, getMinecraftAvatarUrl, getInitials } from '@/lib/utils';

async function getModerationStats() {
  try {
    const [bannedCount, lockedPosts, recentLogs] = await Promise.all([
      db.select({ count: sql<number>`count(*)` })
        .from(users)
        .where(sql`${users.role} = 'banned'`),
      db.select({ count: sql<number>`count(*)` })
        .from(forumPosts)
        .where(eq(forumPosts.locked, true)),
      db.select()
        .from(auditLogs)
        .orderBy(desc(auditLogs.createdAt))
        .limit(10),
    ]);

    return {
      bannedUsers: bannedCount[0]?.count || 0,
      lockedPosts: lockedPosts[0]?.count || 0,
      recentLogs,
    };
  } catch {
    return { bannedUsers: 0, lockedPosts: 0, recentLogs: [] };
  }
}

interface Report {
  id: number;
  type: string;
  content: string;
  reporter: string;
  reported: string;
  createdAt: Date;
  status: string;
}

async function getReportedContent(): Promise<Report[]> {
  // Reports would come from the database when implemented
  // For now, returns empty array - no mock data in production
  return [];
}

export default async function AdminModerationPage() {
  const [stats, reports] = await Promise.all([
    getModerationStats(),
    getReportedContent(),
  ]);

  return (
    <div className="space-y-6">
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
                <p className="text-2xl font-bold">{stats.recentLogs.length}</p>
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
                {reports.map((report) => (
                  <div 
                    key={report.id}
                    className="p-4 rounded-lg bg-secondary/50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <Badge variant={report.type === 'user' ? 'error' : 'warning'}>
                          {report.type}
                        </Badge>
                        <p className="font-medium mt-2">{report.content}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(report.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Reported: <strong>{report.reported}</strong></span>
                      <span>By: {report.reporter}</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button variant="neon" size="sm" className="flex-1">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Resolve
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button variant="ghost" size="sm" className="text-error">
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
            {stats.recentLogs.length > 0 ? (
              <div className="space-y-3">
                {stats.recentLogs.map((log) => (
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
            <Button variant="glass" className="h-auto py-4 flex-col">
              <Ban className="w-6 h-6 mb-2" />
              <span>Ban User</span>
            </Button>
            <Button variant="glass" className="h-auto py-4 flex-col">
              <MessageSquare className="w-6 h-6 mb-2" />
              <span>Lock Post</span>
            </Button>
            <Button variant="glass" className="h-auto py-4 flex-col">
              <Eye className="w-6 h-6 mb-2" />
              <span>View Logs</span>
            </Button>
            <Button variant="glass" className="h-auto py-4 flex-col">
              <Shield className="w-6 h-6 mb-2" />
              <span>IP Ban</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
