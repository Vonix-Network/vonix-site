'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  ArrowLeft, Send, Loader2, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Category {
  id: number;
  name: string;
  slug: string;
}

export default function NewForumPostPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch categories
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/forum/categories');
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
          if (data.length > 0) {
            setCategoryId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Redirect if not logged in
  if (status === 'unauthenticated') {
    router.push('/login?callbackUrl=/forum/new');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!title.trim() || !content.trim() || !categoryId) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/forum/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, categoryId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create post');
      }

      const post = await res.json();
      router.push(`/forum/post/${post.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/forum" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Forum
        </Link>
        <h1 className="text-3xl font-bold gradient-text">Create New Post</h1>
      </div>

      <Card variant="glass">
        <CardHeader>
          <CardTitle>New Discussion</CardTitle>
          <CardDescription>
            Share your thoughts with the community
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 rounded-lg bg-error/10 border border-error/50 text-error flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            {/* Category */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <select
                value={categoryId || ''}
                onChange={(e) => setCategoryId(parseInt(e.target.value))}
                className="w-full bg-secondary/50 border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-neon-cyan/50"
                required
              >
                <option value="" disabled>Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a descriptive title"
                maxLength={200}
                required
              />
              <p className="text-xs text-muted-foreground text-right">
                {title.length}/200
              </p>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your post content here..."
                className="w-full bg-secondary/50 border border-border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 min-h-[300px]"
                maxLength={10000}
                required
              />
              <p className="text-xs text-muted-foreground text-right">
                {content.length}/10000
              </p>
            </div>

            {/* Guidelines */}
            <div className="p-4 rounded-lg bg-neon-cyan/5 border border-neon-cyan/20">
              <h4 className="font-medium mb-2">Posting Guidelines</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Be respectful and constructive</li>
                <li>• Stay on topic for the selected category</li>
                <li>• No spam, advertising, or inappropriate content</li>
                <li>• Search before posting to avoid duplicates</li>
              </ul>
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <Button
                type="submit"
                variant="gradient"
                disabled={isLoading || !title.trim() || !content.trim()}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Create Post
                  </>
                )}
              </Button>
              <Link href="/forum">
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
