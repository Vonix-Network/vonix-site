import { db } from '@/db';
import { users } from '@/db/schema';
import { desc, sql } from 'drizzle-orm';
import Link from 'next/link';
import {
  Users, Search, Filter, MoreHorizontal,
  Shield, Crown, UserX, Mail
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getMinecraftAvatarUrl, getInitials, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

async function getUsers() {
  try {
    return await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        minecraftUsername: users.minecraftUsername,
        xp: users.xp,
        level: users.level,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
        emailVerified: users.emailVerified,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(50);
  } catch {
    return [];
  }
}

async function getUserStats() {
  try {
    const [total, admins, mods, today] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(users),
      db.select({ count: sql<number>`count(*)` }).from(users).where(sql`${users.role} = 'admin'`),
      db.select({ count: sql<number>`count(*)` }).from(users).where(sql`${users.role} = 'moderator'`),
      db.select({ count: sql<number>`count(*)` }).from(users).where(sql`date(${users.createdAt}) = date('now')`),
    ]);
    return {
      total: total[0]?.count || 0,
      admins: admins[0]?.count || 0,
      mods: mods[0]?.count || 0,
      today: today[0]?.count || 0,
    };
  } catch {
    return { total: 0, admins: 0, mods: 0, today: 0 };
  }
}

const getRoleBadge = (role: string) => {
  switch (role) {
    case 'superadmin':
      return <Badge variant="gradient"><Crown className="w-3 h-3 mr-1" /> Owner</Badge>;
    case 'admin':
      return <Badge variant="neon-pink"><Shield className="w-3 h-3 mr-1" /> Admin</Badge>;
    case 'moderator':
      return <Badge variant="neon-purple"><Shield className="w-3 h-3 mr-1" /> Mod</Badge>;
    default:
      return <Badge variant="secondary">User</Badge>;
  }
};

export default async function AdminUsersPage() {
  const [allUsers, stats] = await Promise.all([
    getUsers(),
    getUserStats(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text mb-2">User Management</h1>
          <p className="text-muted-foreground">
            Manage users, roles, and permissions
          </p>
        </div>
        <Button variant="gradient">
          <Users className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: stats.total, color: 'text-neon-cyan' },
          { label: 'Admins', value: stats.admins, color: 'text-neon-pink' },
          { label: 'Moderators', value: stats.mods, color: 'text-neon-purple' },
          { label: 'New Today', value: stats.today, color: 'text-success' },
        ].map((stat) => (
          <Card key={stat.label} variant="glass">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Filters */}
      <Card variant="glass">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search users..." className="pl-10" />
            </div>
            <Button variant="neon-outline">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 font-medium text-muted-foreground">User</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Role</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Level</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Joined</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Last Login</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border hover:bg-secondary/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage
                            src={getMinecraftAvatarUrl(user.minecraftUsername || user.username)}
                            alt={user.username}
                          />
                          <AvatarFallback>
                            {getInitials(user.username)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.username}</p>
                          <p className="text-sm text-muted-foreground">
                            {user.email || 'No email'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">{getRoleBadge(user.role)}</td>
                    <td className="p-4">
                      <span className="text-neon-cyan font-medium">
                        Lv. {user.level || 1}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon">
                          <Mail className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {allUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
