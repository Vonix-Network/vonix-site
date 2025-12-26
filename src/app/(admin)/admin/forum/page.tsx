'use client';

import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, Plus, Edit, Trash2, GripVertical,
  Loader2, Save, X, FolderOpen, Eye, EyeOff, Lock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ForumCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  orderIndex: number;
  createPermission: 'user' | 'moderator' | 'admin';
  replyPermission: 'user' | 'moderator' | 'admin';
  viewPermission: 'user' | 'moderator' | 'admin';
  postCount?: number;
}

const defaultCategory: Partial<ForumCategory> = {
  name: '',
  slug: '',
  description: '',
  icon: '💬',
  createPermission: 'user',
  replyPermission: 'user',
  viewPermission: 'user',
};

export default function AdminForumPage() {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<ForumCategory | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<Partial<ForumCategory>>(defaultCategory);
  const [isSaving, setIsSaving] = useState(false);

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<ForumCategory | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragCounter = useRef(0);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/forum/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error: any) {
      console.error('Failed to fetch categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.slug) {
      toast.error('Name and slug are required');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/forum/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          orderIndex: categories.length,
        }),
      });

      if (res.ok) {
        await fetchCategories();
        setShowCreateModal(false);
        resetForm();
        toast.success('Category created successfully');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create category');
      }
    } catch (error: any) {
      console.error('Failed to create category:', error);
      toast.error('Failed to create category');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingCategory) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/forum/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        await fetchCategories();
        setEditingCategory(null);
        resetForm();
        toast.success('Category updated successfully');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update category');
      }
    } catch (error: any) {
      console.error('Failed to update category:', error);
      toast.error('Failed to update category');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category? All posts in this category will also be deleted.')) return;

    try {
      const res = await fetch(`/api/admin/forum/categories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchCategories();
        toast.success('Category deleted');
      } else {
        toast.error('Failed to delete category');
      }
    } catch (error: any) {
      console.error('Failed to delete category:', error);
      toast.error('Failed to delete category');
    }
  };

  const resetForm = () => {
    setFormData(defaultCategory);
  };

  const openEditModal = (category: ForumCategory) => {
    setEditingCategory(category);
    setFormData(category);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, category: ForumCategory) => {
    setDraggedItem(category);
    e.dataTransfer.effectAllowed = 'move';
    // Add a slight delay to prevent the drag image from disappearing
    setTimeout(() => {
      const element = e.target as HTMLElement;
      element.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const element = e.target as HTMLElement;
    element.style.opacity = '1';
    setDraggedItem(null);
    setDragOverIndex(null);
    dragCounter.current = 0;
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragCounter.current++;
    setDragOverIndex(index);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverIndex(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    dragCounter.current = 0;

    if (!draggedItem) return;

    const sourceIndex = categories.findIndex(c => c.id === draggedItem.id);
    if (sourceIndex === targetIndex) return;

    // Reorder locally first for immediate feedback
    const newCategories = [...categories];
    newCategories.splice(sourceIndex, 1);
    newCategories.splice(targetIndex, 0, draggedItem);

    // Update orderIndex for all items
    const reordered = newCategories.map((cat: any, idx: any) => ({
      ...cat,
      orderIndex: idx,
    }));

    setCategories(reordered);

    // Save to server
    try {
      const res = await fetch('/api/admin/forum/categories/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryOrder: reordered.map((c: any) => ({ id: c.id, orderIndex: c.orderIndex })),
        }),
      });

      if (res.ok) {
        toast.success('Category order updated');
      } else {
        // Revert on failure
        await fetchCategories();
        toast.error('Failed to update order');
      }
    } catch (error: any) {
      await fetchCategories();
      toast.error('Failed to update order');
    }
  };

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Forum Management</h1>
          <p className="text-muted-foreground">
            Manage forum categories and settings
          </p>
        </div>
        <Button variant="gradient" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Category
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-neon-cyan/20">
                <FolderOpen className="w-5 h-5 text-neon-cyan" />
              </div>
              <div>
                <p className="text-2xl font-bold">{categories.length}</p>
                <p className="text-sm text-muted-foreground">Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-neon-purple/20">
                <MessageSquare className="w-5 h-5 text-neon-purple" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {categories.reduce((sum: any, c: any) => sum + Number(c.postCount || 0), 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Posts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/20">
                <Eye className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {categories.filter((c: any) => c.viewPermission === 'user').length}
                </p>
                <p className="text-sm text-muted-foreground">Public Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories List */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Forum Categories</CardTitle>
          <CardDescription>Drag to reorder using the grip handle, click edit to modify</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-neon-cyan" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No forum categories created</p>
              <Button variant="neon" className="mt-4" onClick={() => setShowCreateModal(true)}>
                Create First Category
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {categories.sort((a: any, b: any) => a.orderIndex - b.orderIndex).map((category: any, index: any) => (
                <div
                  key={category.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, category)}
                  onDragEnd={handleDragEnd}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`flex flex-wrap sm:flex-nowrap items-start sm:items-center gap-3 sm:gap-4 p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors ${dragOverIndex === index ? 'border-2 border-neon-cyan border-dashed' : ''
                    } ${draggedItem?.id === category.id ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab active:cursor-grabbing" />
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-neon-cyan/20">
                      {category.icon || '💬'}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{category.name}</span>
                      {category.createPermission !== 'user' && (
                        <Badge variant="warning" className="text-xs">
                          <Lock className="w-3 h-3 mr-1" /> {category.createPermission}
                        </Badge>
                      )}
                      {category.viewPermission !== 'user' && (
                        <Badge variant="secondary" className="text-xs">
                          <EyeOff className="w-3 h-3 mr-1" /> {category.viewPermission} only
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      /{category.slug} • {category.postCount || 0} posts
                    </div>
                    {category.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {category.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-auto sm:ml-0">
                    <Button variant="ghost" size="icon" onClick={() => openEditModal(category)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(category.id)}
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
      {(showCreateModal || editingCategory) && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {editingCategory ? 'Edit Category' : 'Create Category'}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingCategory(null);
                    resetForm();
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category Name *</label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      name: e.target.value,
                      slug: editingCategory ? formData.slug : generateSlug(e.target.value),
                    });
                  }}
                  placeholder="e.g., General Discussion"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">URL Slug *</label>
                <Input
                  value={formData.slug || ''}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="general-discussion"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="A place for general conversations..."
                  className="w-full min-h-[80px] px-3 py-2 rounded-lg bg-secondary/50 border border-border focus:outline-none focus:ring-2 focus:ring-neon-cyan"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Icon (emoji)</label>
                  <Input
                    value={formData.icon || ''}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="💬"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                <h4 className="font-medium">Permissions</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Who can view</label>
                    <select
                      value={formData.viewPermission || 'user'}
                      onChange={(e) => setFormData({ ...formData, viewPermission: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border focus:outline-none focus:ring-2 focus:ring-neon-cyan"
                    >
                      <option value="user">Everyone</option>
                      <option value="moderator">Moderators+</option>
                      <option value="admin">Admins only</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Who can post</label>
                    <select
                      value={formData.createPermission || 'user'}
                      onChange={(e) => setFormData({ ...formData, createPermission: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border focus:outline-none focus:ring-2 focus:ring-neon-cyan"
                    >
                      <option value="user">Everyone</option>
                      <option value="moderator">Moderators+</option>
                      <option value="admin">Admins only</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Who can reply</label>
                    <select
                      value={formData.replyPermission || 'user'}
                      onChange={(e) => setFormData({ ...formData, replyPermission: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border focus:outline-none focus:ring-2 focus:ring-neon-cyan"
                    >
                      <option value="user">Everyone</option>
                      <option value="moderator">Moderators+</option>
                      <option value="admin">Admins only</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingCategory(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="gradient"
                  onClick={editingCategory ? handleUpdate : handleCreate}
                  disabled={isSaving || !formData.name || !formData.slug}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {editingCategory ? 'Update Category' : 'Create Category'}
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

