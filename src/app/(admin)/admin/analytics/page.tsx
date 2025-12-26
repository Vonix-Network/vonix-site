import { db } from '@/db';
import { users, donations, forumPosts, servers } from '@/db/schema';
import { desc, sql, gte, eq } from 'drizzle-orm';
import {
  BarChart3, TrendingUp, Users, DollarSign,
  MessageSquare, Server, Calendar, ArrowUp, ArrowDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { RevenueChart, UserGrowthChart } from '@/components/analytics-charts';

export const dynamic = 'force-dynamic';

async function getAnalytics() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  try {
    const [
      totalUsers,
      newUsersThisMonth,
      newUsersThisWeek,
      totalDonations,
      donationsThisMonth,
      totalPosts,
      postsThisMonth,
      activeServers,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(users),
      db.select({ count: sql<number>`count(*)` }).from(users).where(gte(users.createdAt, thirtyDaysAgo)),
      db.select({ count: sql<number>`count(*)` }).from(users).where(gte(users.createdAt, sevenDaysAgo)),
      db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` }).from(donations),
      db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` }).from(donations).where(gte(donations.createdAt, thirtyDaysAgo)),
      db.select({ count: sql<number>`count(*)` }).from(forumPosts),
      db.select({ count: sql<number>`count(*)` }).from(forumPosts).where(gte(forumPosts.createdAt, thirtyDaysAgo)),
      db.select({ count: sql<number>`count(*)` }).from(servers).where(eq(servers.status, 'online')),
    ]);

    return {
      users: {
        total: totalUsers[0]?.count || 0,
        thisMonth: newUsersThisMonth[0]?.count || 0,
        thisWeek: newUsersThisWeek[0]?.count || 0,
      },
      donations: {
        total: totalDonations[0]?.total || 0,
        thisMonth: donationsThisMonth[0]?.total || 0,
      },
      posts: {
        total: totalPosts[0]?.count || 0,
        thisMonth: postsThisMonth[0]?.count || 0,
      },
      servers: {
        online: activeServers[0]?.count || 0,
      },
    };
  } catch {
    return {
      users: { total: 0, thisMonth: 0, thisWeek: 0 },
      donations: { total: 0, thisMonth: 0 },
      posts: { total: 0, thisMonth: 0 },
      servers: { online: 0 },
    };
  }
}

async function getRevenueChartData(days: number = 90) {
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  try {
    const recentDonations = await db
      .select({
        amount: donations.amount,
        createdAt: donations.createdAt,
      })
      .from(donations)
      .where(gte(donations.createdAt, startDate));

    const dailyRevenue = new Map<string, number>();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      dailyRevenue.set(dateKey, 0);
    }

    for (const donation of recentDonations) {
      const dateKey = new Date(donation.createdAt).toISOString().split('T')[0];
      const current = dailyRevenue.get(dateKey) || 0;
      dailyRevenue.set(dateKey, current + (donation.amount || 0));
    }

    return Array.from(dailyRevenue.entries()).map(([date, value]) => ({
      date,
      label: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value,
    }));
  } catch {
    return [];
  }
}

async function getUserGrowthData(days: number = 90) {
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  try {
    const recentUsers = await db
      .select({
        createdAt: users.createdAt,
      })
      .from(users)
      .where(gte(users.createdAt, startDate));

    const dailyUsers = new Map<string, number>();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      dailyUsers.set(dateKey, 0);
    }

    for (const user of recentUsers) {
      const dateKey = new Date(user.createdAt).toISOString().split('T')[0];
      const current = dailyUsers.get(dateKey) || 0;
      dailyUsers.set(dateKey, current + 1);
    }

    return Array.from(dailyUsers.entries()).map(([date, value]) => ({
      date,
      label: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value,
    }));
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

export default async function AdminAnalyticsPage() {
  const [analytics, recentDonations, revenueChartData, userGrowthData] = await Promise.all([
    getAnalytics(),
    getRecentDonations(),
    getRevenueChartData(),
    getUserGrowthData(),
  ]);

  const stats = [
    {
      title: 'Total Users',
      value: formatNumber(analytics.users.total),
      change: `+${analytics.users.thisMonth} this month`,
      trend: 'up',
      icon: Users,
      color: 'text-neon-cyan',
      bgColor: 'bg-neon-cyan/10',
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(analytics.donations.total),
      change: `+${formatCurrency(analytics.donations.thisMonth)} this month`,
      trend: 'up',
      icon: DollarSign,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Forum Posts',
      value: formatNumber(analytics.posts.total),
      change: `+${analytics.posts.thisMonth} this month`,
      trend: 'up',
      icon: MessageSquare,
      color: 'text-neon-purple',
      bgColor: 'bg-neon-purple/10',
    },
    {
      title: 'Servers Online',
      value: analytics.servers.online.toString(),
      change: 'Currently active',
      trend: 'neutral',
      icon: Server,
      color: 'text-neon-orange',
      bgColor: 'bg-neon-orange/10',
    },
  ];

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h1 className="text-3xl font-bold gradient-text mb-2">Analytics</h1>
        <p className="text-muted-foreground">
          Overview of your community metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} variant="glass">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                {stat.trend === 'up' && (
                  <Badge variant="success" className="flex items-center gap-1">
                    <ArrowUp className="w-3 h-3" />
                    Up
                  </Badge>
                )}
              </div>
              <p className="text-3xl font-bold mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.title}</p>
              <p className="text-xs text-success mt-2">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart
          data={revenueChartData}
          total={analytics.donations.total}
        />
        <UserGrowthChart
          data={userGrowthData}
          totalUsers={analytics.users.total}
          newThisWeek={analytics.users.thisWeek}
        />
      </div>

      {/* Recent Transactions */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-success" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentDonations.length > 0 ? (
            <div className="space-y-3">
              {recentDonations.map((donation: any) => (
                <div
                  key={donation.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/50"
                >
                  <div>
                    <p className="font-medium">
                      {donation.minecraftUsername || donation.username || 'Anonymous'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {donation.paymentType === 'subscription' ? `Subscription: ${donation.rankId || 'Rank'}` : 'One-time'}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="success">{formatCurrency(donation.amount)}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(donation.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No transactions yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card variant="gradient">
        <CardContent className="py-6">
          <h3 className="font-bold mb-4">Quick Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-neon-cyan">
                {analytics.users.thisWeek}
              </p>
              <p className="text-sm text-muted-foreground">New Users (7d)</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-success">
                {formatCurrency(analytics.donations.thisMonth)}
              </p>
              <p className="text-sm text-muted-foreground">Revenue (30d)</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-neon-purple">
                {analytics.posts.thisMonth}
              </p>
              <p className="text-sm text-muted-foreground">Posts (30d)</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-neon-orange">
                {analytics.servers.online}
              </p>
              <p className="text-sm text-muted-foreground">Servers Online</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

