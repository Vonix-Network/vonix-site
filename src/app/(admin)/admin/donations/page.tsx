'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Heart, Search, Eye, EyeOff, Trash2, ExternalLink,
  DollarSign, TrendingUp, RefreshCcw, Plus, X,
  ChevronLeft, ChevronRight, Loader2, Receipt, Save, Edit, Send
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatCurrency, getMinecraftAvatarUrl } from '@/lib/utils';

interface Donation {
  id: number;
  userId: number | null;
  username: string | null;
  avatar: string | null;
  minecraftUsername: string | null;
  amount: number;
  currency: string;
  method: string | null;
  message: string | null;
  displayed: boolean;
  receiptNumber: string | null;
  paymentId: string | null;
  subscriptionId: string | null;
  rankId: string | null;
  rankName: string | null;
  rankColor: string | null;
  days: number | null;
  paymentType: 'one_time' | 'subscription' | 'subscription_renewal';
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  stripeInvoiceUrl: string | null;
  createdAt: string;
}

interface DonationStats {
  totalRevenue: number;
  completedRevenue: number;
  refundedAmount: number;
  totalDonations: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface DonorRank {
  id: string;
  name: string;
  color: string;
}

const defaultNewDonation = {
  minecraftUsername: '',
  amount: '',
  currency: 'USD',
  message: '',
  displayed: true,
  rankId: '',
  days: '',
  paymentType: 'one_time' as const,
  status: 'completed' as const,
  dateOption: 'now' as 'now' | 'custom',
  customDate: '',
};

export default function AdminDonationsPage() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [stats, setStats] = useState<DonationStats | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDonation, setNewDonation] = useState(defaultNewDonation);
  const [isSaving, setIsSaving] = useState(false);
  const [ranks, setRanks] = useState<DonorRank[]>([]);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDonation, setEditingDonation] = useState<Donation | null>(null);
  const [editForm, setEditForm] = useState({
    amount: '',
    currency: 'USD',
    message: '',
    displayed: true,
    rankId: '',
    days: '',
    paymentType: 'one_time' as string,
    status: 'completed' as string,
    minecraftUsername: '',
  });
  const [resendingDiscord, setResendingDiscord] = useState<number | null>(null);

  const fetchDonations = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('paymentType', typeFilter);

      const res = await fetch(`/api/admin/donations?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDonations(data.donations);
        setPagination(data.pagination);
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch donations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter, typeFilter]);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  useEffect(() => {
    // Fetch ranks for the dropdown
    fetch('/api/admin/donor-ranks')
      .then(res => res.ok ? res.json() : [])
      .then(data => setRanks(data))
      .catch(() => setRanks([]));
  }, []);

  const handleAddDonation = async () => {
    if (!newDonation.amount || parseFloat(newDonation.amount) <= 0) {
      alert('Amount is required and must be positive');
      return;
    }
    if (!newDonation.minecraftUsername) {
      alert('Minecraft Username is required');
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        minecraftUsername: newDonation.minecraftUsername || null,
        amount: parseFloat(newDonation.amount),
        currency: newDonation.currency,
        message: newDonation.message || null,
        displayed: newDonation.displayed,
        rankId: newDonation.rankId || null,
        days: newDonation.days ? parseInt(newDonation.days) : null,
        paymentType: newDonation.paymentType,
        status: newDonation.status,
      };

      if (newDonation.dateOption === 'custom' && newDonation.customDate) {
        payload.createdAt = new Date(newDonation.customDate).toISOString();
      }

      const res = await fetch('/api/admin/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setShowAddForm(false);
        setNewDonation(defaultNewDonation);
        fetchDonations();
      } else {
        alert(data.error || 'Failed to add donation');
      }
    } catch (err) {
      console.error('Failed to add donation:', err);
      alert('Failed to add donation. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };


  const toggleVisibility = async (id: number, displayed: boolean) => {
    try {
      const res = await fetch(`/api/admin/donations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayed: !displayed }),
      });
      if (res.ok) {
        setDonations(donations.map(d => d.id === id ? { ...d, displayed: !displayed } : d));
      }
    } catch (err) {
      console.error('Failed to toggle visibility:', err);
    }
  };

  const deleteDonation = async (id: number) => {
    if (!confirm('Are you sure? This will permanently delete this donation record.')) return;
    try {
      const res = await fetch(`/api/admin/donations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDonations(donations.filter(d => d.id !== id));
        fetchDonations();
      }
    } catch (err) {
      console.error('Failed to delete donation:', err);
    }
  };

  const openEditModal = (donation: Donation) => {
    setEditingDonation(donation);
    setEditForm({
      amount: donation.amount.toString(),
      currency: donation.currency,
      message: donation.message || '',
      displayed: donation.displayed,
      rankId: donation.rankId || '',
      days: donation.days?.toString() || '',
      paymentType: donation.paymentType,
      status: donation.status,
      minecraftUsername: donation.minecraftUsername || '',
    });
    setShowEditModal(true);
  };

  const handleEditDonation = async () => {
    if (!editingDonation) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/donations/${editingDonation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: editForm.amount,
          currency: editForm.currency,
          message: editForm.message || null,
          displayed: editForm.displayed,
          rankId: editForm.rankId || null,
          days: editForm.days || null,
          paymentType: editForm.paymentType,
          status: editForm.status,
          minecraftUsername: editForm.minecraftUsername || null,
        }),
      });
      if (res.ok) {
        setShowEditModal(false);
        setEditingDonation(null);
        fetchDonations();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update donation');
      }
    } catch (err) {
      console.error('Failed to update donation:', err);
      alert('Failed to update donation');
    } finally {
      setIsSaving(false);
    }
  };

  const resendDiscord = async (id: number) => {
    setResendingDiscord(id);
    try {
      const res = await fetch(`/api/admin/donations/${id}/resend-discord`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert('Discord notification sent!');
      } else {
        alert(data.error || 'Failed to send Discord notification');
      }
    } catch (err) {
      console.error('Failed to resend Discord:', err);
      alert('Failed to send Discord notification');
    } finally {
      setResendingDiscord(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'error' | 'secondary'> = {
      completed: 'success', pending: 'warning', failed: 'error', refunded: 'secondary',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      one_time: 'One-time', subscription: 'Subscription', subscription_renewal: 'Renewal',
    };
    return <Badge variant="neon-purple">{labels[type] || type}</Badge>;
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Donations</h1>
          <p className="text-muted-foreground">View and manage donation records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="neon" onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Donation
          </Button>
          <Button variant="neon-outline" onClick={fetchDonations} disabled={isLoading}>
            <RefreshCcw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Add Donation Form */}
      {showAddForm && (
        <Card variant="neon-glow">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add Manual Donation
              </span>
              <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Minecraft Username *</label>
                <Input
                  value={newDonation.minecraftUsername}
                  onChange={(e) => setNewDonation({ ...newDonation, minecraftUsername: e.target.value })}
                  placeholder="e.g., Steve"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={newDonation.amount}
                  onChange={(e) => setNewDonation({ ...newDonation, amount: e.target.value })}
                  placeholder="5.00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Currency</label>
                <select
                  value={newDonation.currency}
                  onChange={(e) => setNewDonation({ ...newDonation, currency: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Rank</label>
                <select
                  value={newDonation.rankId}
                  onChange={(e) => setNewDonation({ ...newDonation, rankId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
                >
                  <option value="">No Rank</option>
                  {ranks.map(rank => (
                    <option key={rank.id} value={rank.id}>{rank.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Days</label>
                <Input
                  type="number"
                  min="1"
                  value={newDonation.days}
                  onChange={(e) => setNewDonation({ ...newDonation, days: e.target.value })}
                  placeholder="30"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Type</label>
                <select
                  value={newDonation.paymentType}
                  onChange={(e) => setNewDonation({ ...newDonation, paymentType: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
                >
                  <option value="one_time">One-time</option>
                  <option value="subscription">Subscription</option>
                  <option value="subscription_renewal">Renewal</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select
                  value={newDonation.status}
                  onChange={(e) => setNewDonation({ ...newDonation, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
                >
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <select
                  value={newDonation.dateOption}
                  onChange={(e) => setNewDonation({ ...newDonation, dateOption: e.target.value as 'now' | 'custom' })}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
                >
                  <option value="now">Now</option>
                  <option value="custom">Custom Date</option>
                </select>
              </div>
              {newDonation.dateOption === 'custom' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Custom Date</label>
                  <Input
                    type="datetime-local"
                    value={newDonation.customDate}
                    onChange={(e) => setNewDonation({ ...newDonation, customDate: e.target.value })}
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Message (optional)</label>
              <Input
                value={newDonation.message}
                onChange={(e) => setNewDonation({ ...newDonation, message: e.target.value })}
                placeholder="Thank you for the great server!"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="displayed"
                checked={newDonation.displayed}
                onChange={(e) => setNewDonation({ ...newDonation, displayed: e.target.checked })}
                className="rounded border-border"
              />
              <label htmlFor="displayed" className="text-sm">Show on public donations page</label>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="neon" onClick={handleAddDonation} disabled={isSaving || !newDonation.amount}>
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Donation
              </Button>
              <Button variant="ghost" onClick={() => { setShowAddForm(false); setNewDonation(defaultNewDonation); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card variant="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/20">
                  <DollarSign className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(stats.completedRevenue)}</p>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-neon-cyan/20">
                  <Heart className="w-5 h-5 text-neon-cyan" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalDonations}</p>
                  <p className="text-sm text-muted-foreground">Total Donations</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-neon-purple/20">
                  <TrendingUp className="w-5 h-5 text-neon-purple" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {stats.totalDonations > 0 ? formatCurrency(stats.completedRevenue / stats.totalDonations) : '$0'}
                  </p>
                  <p className="text-sm text-muted-foreground">Avg Donation</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-error/20">
                  <RefreshCcw className="w-5 h-5 text-error" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(stats.refundedAmount)}</p>
                  <p className="text-sm text-muted-foreground">Refunded</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card variant="glass">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by username, receipt #, payment ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
            >
              <option value="">All Types</option>
              <option value="one_time">One-time</option>
              <option value="subscription">Subscription</option>
              <option value="subscription_renewal">Renewal</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Donations List */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Donation Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
            </div>
          ) : donations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No donations found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {donations.map((donation) => (
                <div
                  key={donation.id}
                  className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage
                      src={donation.avatar || getMinecraftAvatarUrl(donation.minecraftUsername || donation.username || '')}
                    />
                    <AvatarFallback>{(donation.username || 'U')[0].toUpperCase()}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{donation.username || donation.minecraftUsername || 'Anonymous'}</span>
                      {donation.rankName && (
                        <Badge style={{ backgroundColor: `${donation.rankColor}20`, color: donation.rankColor || undefined }}>
                          {donation.rankName}
                        </Badge>
                      )}
                      {getStatusBadge(donation.status)}
                      {getTypeBadge(donation.paymentType)}
                    </div>
                    <div className="text-sm text-muted-foreground flex flex-wrap gap-2">
                      <span>{formatDate(donation.createdAt)}</span>
                      {donation.receiptNumber && <span>• {donation.receiptNumber}</span>}
                      {donation.days && <span>• {donation.days} days</span>}
                    </div>
                    {donation.message && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">&quot;{donation.message}&quot;</p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold text-success">{formatCurrency(donation.amount)}</p>
                    <p className="text-xs text-muted-foreground">{donation.currency}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditModal(donation)}
                      title="Edit donation"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => resendDiscord(donation.id)}
                      disabled={resendingDiscord === donation.id}
                      title="Resend Discord notification"
                    >
                      {resendingDiscord === donation.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleVisibility(donation.id, donation.displayed)}
                      title={donation.displayed ? 'Hide from public' : 'Show publicly'}
                    >
                      {donation.displayed ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                    </Button>
                    {donation.stripeInvoiceUrl && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={donation.stripeInvoiceUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteDonation(donation.id)}
                      className="text-error hover:text-error"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm">Page {pagination.page} of {pagination.totalPages}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {showEditModal && editingDonation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card variant="neon-glow" className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Edit className="w-5 h-5" />
                  Edit Donation #{editingDonation.id}
                </span>
                <Button variant="ghost" size="icon" onClick={() => setShowEditModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Minecraft Username</label>
                  <Input
                    value={editForm.minecraftUsername}
                    onChange={(e) => setEditForm({ ...editForm, minecraftUsername: e.target.value })}
                    placeholder="e.g., Steve"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Currency</label>
                  <select
                    value={editForm.currency}
                    onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rank</label>
                  <select
                    value={editForm.rankId}
                    onChange={(e) => setEditForm({ ...editForm, rankId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
                  >
                    <option value="">No Rank</option>
                    {ranks.map(rank => (
                      <option key={rank.id} value={rank.id}>{rank.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Days</label>
                  <Input
                    type="number"
                    min="1"
                    value={editForm.days}
                    onChange={(e) => setEditForm({ ...editForm, days: e.target.value })}
                    placeholder="30"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Type</label>
                  <select
                    value={editForm.paymentType}
                    onChange={(e) => setEditForm({ ...editForm, paymentType: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
                  >
                    <option value="one_time">One-time</option>
                    <option value="subscription">Subscription</option>
                    <option value="subscription_renewal">Renewal</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
                  >
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Message</label>
                <Input
                  value={editForm.message}
                  onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
                  placeholder="Donation message"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editDisplayed"
                  checked={editForm.displayed}
                  onChange={(e) => setEditForm({ ...editForm, displayed: e.target.checked })}
                  className="rounded border-border"
                />
                <label htmlFor="editDisplayed" className="text-sm">Show on public donations page</label>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="neon" onClick={handleEditDonation} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
                <Button variant="ghost" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}


