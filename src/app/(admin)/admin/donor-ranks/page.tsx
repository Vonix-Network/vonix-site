'use client';

import { useState, useEffect } from 'react';
import { 
  Crown, Plus, Edit, Trash2, DollarSign, 
  Loader2, Save, X, Sparkles, GripVertical
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ToggleCard } from '@/components/ui/toggle-switch';

interface DonorRank {
  id: string;
  name: string;
  minAmount: number;
  color: string;
  textColor: string;
  icon: string | null;
  badge: string | null;
  glow: boolean;
  duration: number;
  subtitle: string | null;
  perks: string | null;
  stripeProductId: string | null;
  stripePriceMonthly: string | null;
}

const defaultRank: Partial<DonorRank> = {
  name: '',
  minAmount: 0,
  color: '#00D9FF',
  textColor: '#FFFFFF',
  icon: '⭐',
  badge: null,
  glow: false,
  duration: 30,
  subtitle: '',
  perks: '',
};

export default function AdminDonorRanksPage() {
  const [ranks, setRanks] = useState<DonorRank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingRank, setEditingRank] = useState<DonorRank | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<Partial<DonorRank>>(defaultRank);
  const [isSaving, setIsSaving] = useState(false);
  const [perksInput, setPerksInput] = useState('');

  useEffect(() => {
    fetchRanks();
  }, []);

  const fetchRanks = async () => {
    try {
      const res = await fetch('/api/admin/donor-ranks');
      if (res.ok) {
        const data = await res.json();
        setRanks(data);
      }
    } catch (error) {
      console.error('Failed to fetch ranks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.id) return;
    
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/donor-ranks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          perks: perksInput ? JSON.stringify(perksInput.split('\n').filter(p => p.trim())) : null,
        }),
      });

      if (res.ok) {
        await fetchRanks();
        setShowCreateModal(false);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to create rank:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingRank) return;
    
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/donor-ranks/${editingRank.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          perks: perksInput ? JSON.stringify(perksInput.split('\n').filter(p => p.trim())) : null,
        }),
      });

      if (res.ok) {
        await fetchRanks();
        setEditingRank(null);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to update rank:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rank?')) return;

    try {
      const res = await fetch(`/api/admin/donor-ranks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchRanks();
      }
    } catch (error) {
      console.error('Failed to delete rank:', error);
    }
  };

  const resetForm = () => {
    setFormData(defaultRank);
    setPerksInput('');
  };

  const openEditModal = (rank: DonorRank) => {
    setEditingRank(rank);
    setFormData(rank);
    try {
      const perks = rank.perks ? JSON.parse(rank.perks) : [];
      setPerksInput(Array.isArray(perks) ? perks.join('\n') : '');
    } catch {
      setPerksInput('');
    }
  };

  const generateId = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Donor Ranks</h1>
          <p className="text-muted-foreground">
            Manage donation tiers and rewards
          </p>
        </div>
        <Button variant="gradient" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Rank
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-neon-cyan/20">
                <Crown className="w-5 h-5 text-neon-cyan" />
              </div>
              <div>
                <p className="text-2xl font-bold">{ranks.length}</p>
                <p className="text-sm text-muted-foreground">Total Ranks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/20">
                <DollarSign className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  ${ranks.length > 0 ? Math.min(...ranks.map(r => r.minAmount)) : 0}
                </p>
                <p className="text-sm text-muted-foreground">Starting Price</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-neon-purple/20">
                <Sparkles className="w-5 h-5 text-neon-purple" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {ranks.filter(r => r.glow).length}
                </p>
                <p className="text-sm text-muted-foreground">With Glow Effect</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ranks List */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>All Ranks</CardTitle>
          <CardDescription>Drag to reorder, click to edit</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-neon-cyan" />
            </div>
          ) : ranks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Crown className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No donor ranks configured</p>
              <Button variant="neon" className="mt-4" onClick={() => setShowCreateModal(true)}>
                Create First Rank
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {ranks.sort((a, b) => a.minAmount - b.minAmount).map((rank) => (
                <div
                  key={rank.id}
                  className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                  
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{ backgroundColor: rank.color, color: rank.textColor }}
                  >
                    {rank.icon || '⭐'}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold" style={{ color: rank.color }}>
                        {rank.name}
                      </span>
                      {rank.glow && (
                        <Badge variant="neon-purple" className="text-xs">
                          <Sparkles className="w-3 h-3 mr-1" /> Glow
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ${rank.minAmount} • {rank.duration} days
                      {rank.subtitle && ` • ${rank.subtitle}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">${rank.minAmount}</Badge>
                    <Button variant="ghost" size="icon" onClick={() => openEditModal(rank)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(rank.id)}
                      className="text-error hover:text-error"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingRank) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card variant="glass" className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {editingRank ? 'Edit Rank' : 'Create Rank'}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingRank(null);
                    resetForm();
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rank Name *</label>
                  <Input
                    value={formData.name || ''}
                    onChange={(e) => {
                      setFormData({ 
                        ...formData, 
                        name: e.target.value,
                        id: editingRank ? formData.id : generateId(e.target.value),
                      });
                    }}
                    placeholder="e.g., VIP"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">ID *</label>
                  <Input
                    value={formData.id || ''}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    placeholder="vip"
                    disabled={!!editingRank}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Price ($) *</label>
                  <Input
                    type="number"
                    value={formData.minAmount || ''}
                    onChange={(e) => setFormData({ ...formData, minAmount: parseFloat(e.target.value) })}
                    placeholder="9.99"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Duration (days)</label>
                  <Input
                    type="number"
                    value={formData.duration || 30}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    placeholder="30"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Color</label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.color || '#00D9FF'}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={formData.color || '#00D9FF'}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="#00D9FF"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Text Color</label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.textColor || '#FFFFFF'}
                      onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={formData.textColor || '#FFFFFF'}
                      onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                      placeholder="#FFFFFF"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Icon (emoji)</label>
                  <Input
                    value={formData.icon || ''}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="⭐"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subtitle</label>
                  <Input
                    value={formData.subtitle || ''}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    placeholder="e.g., Most Popular"
                  />
                </div>
              </div>

              <ToggleCard
                checked={formData.glow || false}
                onChange={(val) => setFormData({ ...formData, glow: val })}
                label="Glow Effect"
                description="Add a glowing effect to the rank badge"
              />

              <div className="space-y-2">
                <label className="text-sm font-medium">Perks (one per line)</label>
                <textarea
                  value={perksInput}
                  onChange={(e) => setPerksInput(e.target.value)}
                  placeholder="Priority server access&#10;Custom nickname color&#10;Exclusive Discord role"
                  className="w-full min-h-[120px] px-3 py-2 rounded-lg bg-secondary/50 border border-border focus:outline-none focus:ring-2 focus:ring-neon-cyan"
                />
              </div>

              <div className="border-t border-border pt-4">
                <h4 className="font-medium mb-3">Stripe Integration</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Stripe Product ID</label>
                    <Input
                      value={formData.stripeProductId || ''}
                      onChange={(e) => setFormData({ ...formData, stripeProductId: e.target.value })}
                      placeholder="prod_..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Monthly Price ID</label>
                    <Input
                      value={formData.stripePriceMonthly || ''}
                      onChange={(e) => setFormData({ ...formData, stripePriceMonthly: e.target.value })}
                      placeholder="price_..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingRank(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="gradient"
                  onClick={editingRank ? handleUpdate : handleCreate}
                  disabled={isSaving || !formData.name || !formData.id}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {editingRank ? 'Update Rank' : 'Create Rank'}
                    </>
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
