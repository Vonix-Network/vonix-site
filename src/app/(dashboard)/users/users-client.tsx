'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getMinecraftAvatarUrl } from '@/lib/utils';

interface User {
    id: number;
    username: string;
    minecraftUsername: string | null;
    level: number;
    xp: number;
    role: string;
    avatar: string | null;
    createdAt: Date | null;
}

interface UsersPageClientProps {
    users: User[];
    total: number;
    pages: number;
    currentPage: number;
    initialSearch: string;
}

export function UsersPageClient({
    users,
    total,
    pages,
    currentPage,
    initialSearch,
}: UsersPageClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [search, setSearch] = useState(initialSearch);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams(searchParams?.toString() || '');
        if (search) {
            params.set('search', search);
        } else {
            params.delete('search');
        }
        params.set('page', '1');
        router.push(`/users?${params.toString()}`);
    };

    const changePage = (page: number) => {
        const params = new URLSearchParams(searchParams?.toString() || '');
        params.set('page', page.toString());
        router.push(`/users?${params.toString()}`);
    };

    const getRoleBadge = (role: string) => {
        const variants: Record<string, 'success' | 'warning' | 'error' | 'neon-cyan' | 'secondary'> = {
            superadmin: 'error',
            admin: 'warning',
            moderator: 'neon-cyan',
            user: 'secondary',
        };
        return <Badge variant={variants[role] || 'secondary'}>{role}</Badge>;
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-4xl font-bold gradient-text mb-4">Community Members</h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                    Browse and discover players in the Vonix Network community
                </p>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="max-w-md mx-auto">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                        placeholder="Search by username..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-12 pr-24 py-6 text-lg bg-secondary/50 border-white/10"
                    />
                    <Button
                        type="submit"
                        variant="neon"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                    >
                        Search
                    </Button>
                </div>
            </form>

            {/* Stats */}
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{total} members</span>
                </div>
                {initialSearch && (
                    <span>• Showing results for "{initialSearch}"</span>
                )}
            </div>

            {/* Users Grid */}
            {users.length === 0 ? (
                <div className="text-center py-16">
                    <Users className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No users found</h3>
                    <p className="text-muted-foreground">
                        {initialSearch ? 'Try a different search term' : 'No users have registered yet'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {users.map((user: any) => (
                        <Link key={user.id} href={`/profile/${user.username}`}>
                            <Card variant="glass" className="hover:border-neon-cyan/30 transition-all group">
                                <CardContent className="p-4">
                                    <div className="flex flex-col items-center text-center gap-3">
                                        <Avatar glow className="w-16 h-16 group-hover:ring-2 ring-neon-cyan/50 transition-all">
                                            <AvatarImage
                                                src={getMinecraftAvatarUrl(user.minecraftUsername || user.username)}
                                                alt={user.username}
                                            />
                                            <AvatarFallback>
                                                {user.username.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div>
                                            <h3 className="font-semibold group-hover:text-neon-cyan transition-colors">
                                                {user.username}
                                            </h3>
                                            {user.minecraftUsername && user.minecraftUsername !== user.username && (
                                                <p className="text-xs text-muted-foreground">
                                                    MC: {user.minecraftUsername}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-neon-cyan font-medium">
                                                Lv. {user.level}
                                            </span>
                                            {getRoleBadge(user.role)}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {pages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => changePage(currentPage - 1)}
                        disabled={currentPage <= 1}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>

                    <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
                            let pageNum: number;
                            if (pages <= 7) {
                                pageNum = i + 1;
                            } else if (currentPage <= 4) {
                                pageNum = i + 1;
                            } else if (currentPage >= pages - 3) {
                                pageNum = pages - 6 + i;
                            } else {
                                pageNum = currentPage - 3 + i;
                            }

                            return (
                                <Button
                                    key={pageNum}
                                    variant={pageNum === currentPage ? 'neon' : 'ghost'}
                                    size="icon"
                                    onClick={() => changePage(pageNum)}
                                    className="w-10 h-10"
                                >
                                    {pageNum}
                                </Button>
                            );
                        })}
                    </div>

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => changePage(currentPage + 1)}
                        disabled={currentPage >= pages}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
