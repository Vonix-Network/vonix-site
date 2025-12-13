'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  Users, Search, Filter, MoreHorizontal,
  Shield, Crown, UserX, Mail, Plus, Loader2,
  Check, X, Edit, Trash2, Ban, UserCheck, Copy, Key
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getMinecraftAvatarUrl, getInitials, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface UserData {
  id: number;
  username: string;
  email: string | null;
  role: string;
  minecraftUsername: string | null;
  xp: number;
  level: number;
  createdAt: Date;
  lastLoginAt: Date | null;
  emailVerified: boolean;
  // Rank fields
  donationRankId: string | null;
  rankExpiresAt: Date | null;
  totalDonated: number;
  subscriptionStatus: string | null;
}

interface UserStats {
  total: number;
  admins: number;
  mods: number;
  today: number;
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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<UserStats>({ total: 0, admins: 0, mods: 0, today: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<number | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // New user form
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user',
    minecraftUsername: '',
  });

  // Edit user form
  const [editForm, setEditForm] = useState({
    role: 'user',
    email: '',
    minecraftUsername: '',
    // Rank fields
    donationRankId: '',
    rankExpiresAt: '',
    totalDonated: '',
    subscriptionStatus: '',
  });

  // Donation ranks for dropdown
  const [ranks, setRanks] = useState<{ id: string; name: string; color: string }[]>([]);

  // Password reset modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordUserId, setPasswordUserId] = useState<number | null>(null);
  const [passwordUsername, setPasswordUsername] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Initial fetch on mount is handled by the debounce effect because searchQuery starts empty

  useEffect(() => {
    fetchStats();
    // Fetch ranks for dropdown
    fetch('/api/admin/donor-ranks')
      .then(res => res.ok ? res.json() : [])
      .then(data => setRanks(data))
      .catch(() => setRanks([]));
  }, []);

  const fetchUsers = async (search = '') => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/users/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password) {
      toast.error('Username and password are required');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      if (res.ok) {
        toast.success('User created successfully');
        setShowAddModal(false);
        setNewUser({ username: '', email: '', password: '', role: 'user', minecraftUsername: '' });
        fetchUsers();
        fetchStats();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create user');
      }
    } catch (error) {
      toast.error('Failed to create user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        toast.success('User updated successfully');
        setShowEditModal(false);
        setSelectedUser(null);
        fetchUsers();
        fetchStats();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update user');
      }
    } catch (error) {
      toast.error('Failed to update user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('User deleted');
        fetchUsers();
        fetchStats();
      } else {
        toast.error('Failed to delete user');
      }
    } catch (error) {
      toast.error('Failed to delete user');
    }
    setActionMenuOpen(null);
  };

  const handleBanUser = async (userId: number) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, { method: 'POST' });
      if (res.ok) {
        toast.success('User banned');
        fetchUsers();
      } else {
        toast.error('Failed to ban user');
      }
    } catch (error) {
      toast.error('Failed to ban user');
    }
    setActionMenuOpen(null);
  };

  const handleCopyEmail = async (email: string) => {
    // Check if on mobile (no clipboard API or touch device)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      // On mobile, open mail app
      window.location.href = `mailto:${email}`;
    } else {
      // On desktop, copy to clipboard
      try {
        await navigator.clipboard.writeText(email);
        toast.success('Email copied to clipboard');
      } catch (err) {
        // Fallback to mailto
        window.location.href = `mailto:${email}`;
      }
    }
  };

  const openEditModal = (user: UserData) => {
    setSelectedUser(user);
    setEditForm({
      role: user.role,
      email: user.email || '',
      minecraftUsername: user.minecraftUsername || '',
      donationRankId: user.donationRankId || '',
      rankExpiresAt: user.rankExpiresAt ? new Date(user.rankExpiresAt).toISOString().slice(0, 16) : '',
      totalDonated: user.totalDonated?.toString() || '0',
      subscriptionStatus: user.subscriptionStatus || '',
    });
    setShowEditModal(true);
    setActionMenuOpen(null);
  };

  const handleGeneratePassword = async () => {
    if (!passwordUserId) return;
    setResettingPassword(true);
    try {
      const res = await fetch(`/api/admin/users/${passwordUserId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generatePassword: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratedPassword(data.generatedPassword);
        toast.success('Password generated successfully');
      } else {
        toast.error(data.error || 'Failed to generate password');
      }
    } catch {
      toast.error('Failed to generate password');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleSetCustomPassword = async () => {
    if (!passwordUserId || !customPassword) return;
    if (customPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setResettingPassword(true);
    try {
      const res = await fetch(`/api/admin/users/${passwordUserId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: customPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Password set successfully');
        setShowPasswordModal(false);
        setCustomPassword('');
      } else {
        toast.error(data.error || 'Failed to set password');
      }
    } catch {
      toast.error('Failed to set password');
    } finally {
      setResettingPassword(false);
    }
  };

  const copyGeneratedPassword = async () => {
    try {
      await navigator.clipboard.writeText(generatedPassword);
      setPasswordCopied(true);
      toast.success('Password copied to clipboard');
      setTimeout(() => setPasswordCopied(false), 2000);
    } catch {
      toast.error('Failed to copy password');
    }
  };

  const filteredUsers = users;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text mb-2">User Management</h1>
          <p className="text-muted-foreground">
            Manage users, roles, and permissions
          </p>
        </div>
        <Button variant="gradient" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
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
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
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
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
            </div>
          ) : (
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
                  {filteredUsers.map((user) => (
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
                        <div className="flex justify-end gap-2 relative">
                          {user.email && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCopyEmail(user.email!)}
                              title="Copy email or open mail app"
                            >
                              <Mail className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              if (actionMenuOpen === user.id) {
                                setActionMenuOpen(null);
                                setDropdownPosition(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setDropdownPosition({
                                  top: rect.bottom + 4,
                                  left: rect.right - 160, // menu width
                                });
                                setActionMenuOpen(user.id);
                              }
                            }}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Close dropdown when clicking outside - use portal */}
      {actionMenuOpen !== null && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => {
              setActionMenuOpen(null);
              setDropdownPosition(null);
            }}
          />
          {dropdownPosition && (
            <div
              className="fixed z-[9999] min-w-[160px] bg-card border border-border rounded-lg shadow-lg overflow-hidden"
              style={{
                top: dropdownPosition.top,
                left: dropdownPosition.left,
              }}
            >
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-secondary flex items-center gap-2"
                onClick={() => {
                  const user = users.find(u => u.id === actionMenuOpen);
                  if (user) openEditModal(user);
                }}
              >
                <Edit className="w-4 h-4" /> Edit User
              </button>
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-secondary flex items-center gap-2"
                onClick={() => {
                  const user = users.find(u => u.id === actionMenuOpen);
                  if (user) {
                    const newRole = user.role === 'user' ? 'moderator' : user.role === 'moderator' ? 'admin' : 'user';
                    setSelectedUser(user);
                    setEditForm({ ...editForm, role: newRole });
                    openEditModal(user);
                  }
                }}
              >
                <UserCheck className="w-4 h-4" /> Change Role
              </button>
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-secondary flex items-center gap-2 text-warning"
                onClick={() => actionMenuOpen && handleBanUser(actionMenuOpen)}
              >
                <Ban className="w-4 h-4" /> Ban User
              </button>
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-secondary flex items-center gap-2 text-neon-cyan"
                onClick={() => {
                  const user = users.find(u => u.id === actionMenuOpen);
                  if (user) {
                    setPasswordUserId(user.id);
                    setPasswordUsername(user.username);
                    setGeneratedPassword('');
                    setCustomPassword('');
                    setShowPasswordModal(true);
                    setActionMenuOpen(null);
                  }
                }}
              >
                <Key className="w-4 h-4" /> Reset Password
              </button>
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-secondary flex items-center gap-2 text-error"
                onClick={() => actionMenuOpen && handleDeleteUser(actionMenuOpen)}
              >
                <Trash2 className="w-4 h-4" /> Delete User
              </button>
            </div>
          )}
        </>,
        document.body
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Add New User
                <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Username *</label>
                <Input
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder="Enter username"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Password *</label>
                <Input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Enter password"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Minecraft Username</label>
                <Input
                  value={newUser.minecraftUsername}
                  onChange={(e) => setNewUser({ ...newUser, minecraftUsername: e.target.value })}
                  placeholder="Steve"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border focus:outline-none focus:ring-2 focus:ring-neon-cyan"
                >
                  <option value="user">User</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button variant="gradient" onClick={handleCreateUser} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Create User
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Edit User: {selectedUser.username}
                <Button variant="ghost" size="icon" onClick={() => { setShowEditModal(false); setSelectedUser(null); }}>
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info Section */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Minecraft Username</label>
                    <Input
                      value={editForm.minecraftUsername}
                      onChange={(e) => setEditForm({ ...editForm, minecraftUsername: e.target.value })}
                      placeholder="Steve"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Site Role</label>
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border focus:outline-none focus:ring-2 focus:ring-neon-cyan"
                    >
                      <option value="user">User</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                      <option value="superadmin">Super Admin</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Donation Rank Section */}
              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-neon-pink" />
                  Donation Rank Management
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Donation Rank</label>
                    <select
                      value={editForm.donationRankId}
                      onChange={(e) => setEditForm({ ...editForm, donationRankId: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border focus:outline-none focus:ring-2 focus:ring-neon-cyan"
                    >
                      <option value="">No Rank</option>
                      {ranks.map(rank => (
                        <option key={rank.id} value={rank.id}>{rank.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Rank Expires At</label>
                    <Input
                      type="datetime-local"
                      value={editForm.rankExpiresAt}
                      onChange={(e) => setEditForm({ ...editForm, rankExpiresAt: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Total Donated ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editForm.totalDonated}
                      onChange={(e) => setEditForm({ ...editForm, totalDonated: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Subscription Status</label>
                    <select
                      value={editForm.subscriptionStatus}
                      onChange={(e) => setEditForm({ ...editForm, subscriptionStatus: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border focus:outline-none focus:ring-2 focus:ring-neon-cyan"
                    >
                      <option value="">None</option>
                      <option value="active">Active</option>
                      <option value="past_due">Past Due</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="paused">Paused</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="ghost" onClick={() => { setShowEditModal(false); setSelectedUser(null); }}>Cancel</Button>
                <Button variant="gradient" onClick={handleUpdateUser} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card variant="glass" className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-neon-cyan" />
                Reset Password
              </CardTitle>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setGeneratedPassword('');
                  setCustomPassword('');
                }}
                className="p-1 hover:bg-secondary rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Reset password for <strong className="text-foreground">{passwordUsername}</strong>
              </p>

              {/* Generated Password Display */}
              {generatedPassword && (
                <div className="p-4 rounded-lg bg-success/10 border border-success/30 space-y-3">
                  <p className="text-sm text-success font-medium">Generated Password:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-background rounded font-mono text-sm break-all">
                      {generatedPassword}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyGeneratedPassword}
                    >
                      {passwordCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Make sure to share this with the user securely. This won&apos;t be shown again.
                  </p>
                </div>
              )}

              {/* Generate Password Button */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Option 1: Generate Random Password</p>
                <Button
                  variant="neon"
                  onClick={handleGeneratePassword}
                  disabled={resettingPassword}
                  className="w-full"
                >
                  {resettingPassword ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                  ) : (
                    <><Key className="w-4 h-4 mr-2" /> Generate Secure Password</>
                  )}
                </Button>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">OR</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Custom Password */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Option 2: Set Custom Password</p>
                <Input
                  type="text"
                  placeholder="Enter new password (min 8 characters)"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                />
                <Button
                  variant="neon-outline"
                  onClick={handleSetCustomPassword}
                  disabled={resettingPassword || customPassword.length < 8}
                  className="w-full"
                >
                  {resettingPassword ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Setting...</>
                  ) : (
                    <><Check className="w-4 h-4 mr-2" /> Set Password</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

