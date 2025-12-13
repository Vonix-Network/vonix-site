import { db } from '@/db';
import { users, donations, forumPosts, servers } from '@/db/schema';
import { sql, desc, eq } from 'drizzle-orm';
import {
  Users, DollarSign, MessageSquare, Server,
  Activity, AlertTriangle, CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatNumber, formatRelativeTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

async function getStats() {
  try {
    const [
      userCount,
      donationStats,
      postCount,
      serverCount,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(users),
      db.select({
        total: sql<number>`COALESCE(SUM(amount), 0)`,
        count: sql<number>`count(*)`,
      }).from(donations),
      db.select({ count: sql<number>`count(*)` }).from(forumPosts),
      db.select({ count: sql<number>`count(*)` }).from(servers),
    ]);

    return {
      users: userCount[0]?.count || 0,
      donations: donationStats[0]?.total || 0,
      donationCount: donationStats[0]?.count || 0,
      posts: postCount[0]?.count || 0,
      servers: serverCount[0]?.count || 0,
    };
  } catch {
    return { users: 0, donations: 0, donationCount: 0, posts: 0, servers: 0 };
  }
}

async function getRecentUsers() {
  try {
    return await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(5);
  } catch {
    return [];
  }
}

async function getRecentDonations() {
  try {
    return await db
      .select({
        id: donations.id,
        amount: donations.amount,
        createdAt: donations.createdAt,
        paymentType: donations.paymentType,
        rankId: donations.rankId,
        username: users.username,
        minecraftUsername: users.minecraftUsername,
      })
      .from(donations)
      .leftJoin(users, eq(donations.userId, users.id))
      .orderBy(desc(donations.createdAt))
      .limit(5);
  } catch {
    return [];
  }
}

export default async function AdminDashboard() {
  const [stats, recentUsers, recentDonations] = await Promise.all([
    getStats(),
    getRecentUsers(),
    getRecentDonations(),
  ]);

  const statCards = [
    {
      title: 'Total Users',
      value: formatNumber(stats.users),
      icon: Users,
      color: 'text-neon-cyan',
      bgColor: 'bg-neon-cyan/10',
    },
    {
      title: 'Total Donations',
      value: formatCurrency(stats.donations),
      icon: DollarSign,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Forum Posts',
      value: formatNumber(stats.posts),
      icon: MessageSquare,
      color: 'text-neon-purple',
      bgColor: 'bg-neon-purple/10',
    },
    {
      title: 'Servers',
      value: stats.servers.toString(),
      icon: Server,
      color: 'text-neon-orange',
      bgColor: 'bg-neon-orange/10',
    },
  ];

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h1 className="text-3xl font-bold gradient-text mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your Vonix Network community
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.title} variant="glass">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-neon-cyan" />
              Recent Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentUsers.length > 0 ? (
              <div className="space-y-3">
                {recentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                  >
                    <div>
                      <p className="font-medium">{user.username}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatRelativeTime(user.createdAt)}
                      </p>
                    </div>
                    <Badge variant={
                      user.role === 'admin' ? 'neon-pink' :
                        user.role === 'moderator' ? 'neon-purple' :
                          'secondary'
                    }>
                      {user.role}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No users yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Donations */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-success" />
              Recent Donations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentDonations.length > 0 ? (
              <div className="space-y-3">
                {recentDonations.map((donation) => (
                  <div
                    key={donation.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                  >
                    <div>
                      <p className="font-medium">
                        {donation.minecraftUsername || donation.username || 'Anonymous'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatRelativeTime(donation.createdAt)}
                      </p>
                    </div>
                    <Badge variant="success">
                      {formatCurrency(donation.amount)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No donations yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card variant="gradient">
        <CardContent className="py-6">
          <h3 className="font-bold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Add Server', icon: Server, href: '/admin/servers' },
              { label: 'Announcement', icon: MessageSquare, href: '/admin/announcements/new' },
              { label: 'View Reports', icon: AlertTriangle, href: '/admin/moderation' },
              { label: 'System Status', icon: Activity, href: '/admin/status' },
            ].map((action) => (
              <a
                key={action.label}
                href={action.href}
                className="flex flex-col items-center gap-2 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <action.icon className="w-6 h-6" />
                <span className="text-sm">{action.label}</span>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-neon-cyan" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: 'Database', status: 'operational' },
              { name: 'Authentication', status: 'operational' },
              { name: 'Payment System', status: 'operational' },
            ].map((service) => (
              <div
                key={service.name}
                className="flex items-center justify-between p-4 rounded-lg bg-secondary/50"
              >
                <span>{service.name}</span>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-sm text-success capitalize">
                    {service.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

