import { Suspense } from 'react';
import { db, users } from '@/db';
import { like, or, desc, sql } from 'drizzle-orm';
import { UsersPageClient } from './users-client';

export const dynamic = 'force-dynamic';

async function getUsers(search?: string, page = 1, limit = 24) {
    const offset = (page - 1) * limit;

    // Build where clause for search
    const whereClause = search
        ? or(
            like(users.username, `%${search}%`),
            like(users.minecraftUsername, `%${search}%`)
        )
        : undefined;

    // Get users
    const usersList = await db.select({
        id: users.id,
        username: users.username,
        minecraftUsername: users.minecraftUsername,
        level: users.level,
        xp: users.xp,
        role: users.role,
        avatar: users.avatar,
        createdAt: users.createdAt,
    })
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.level), desc(users.xp))
        .limit(limit)
        .offset(offset);

    // Get total count
    const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(users)
        .where(whereClause);

    const total = countResult[0]?.count || 0;

    return {
        users: usersList,
        total,
        pages: Math.ceil(total / limit),
        page,
    };
}

export default async function UsersPage({
    searchParams,
}: {
    searchParams: Promise<{ search?: string; page?: string }> | undefined;
}) {
    const params = searchParams ? await searchParams : {};
    const search = params?.search || '';
    const page = parseInt(params?.page || '1', 10);

    const data = await getUsers(search, page);

    return (
        <main className="min-h-screen pt-24 pb-16">
            <div className="container mx-auto px-4">
                <Suspense fallback={<div className="text-center py-12">Loading users...</div>}>
                    <UsersPageClient
                        users={data.users}
                        total={data.total}
                        pages={data.pages}
                        currentPage={data.page}
                        initialSearch={search}
                    />
                </Suspense>
            </div>
        </main>
    );
}
