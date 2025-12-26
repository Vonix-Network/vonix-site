import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../../auth';
import { db } from '@/db';
import { forumCategories } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function requireAdmin() {
    const session = await auth();
    const user = session?.user as any;

    if (!session || !['admin', 'superadmin'].includes(user?.role)) {
        throw new Error('Unauthorized');
    }

    return user;
}

/**
 * POST /api/admin/forum/categories/reorder
 * Reorder forum categories
 */
export async function POST(request: NextRequest) {
    try {
        await requireAdmin();
        const body = await request.json();
        const { categoryOrder } = body;

        if (!Array.isArray(categoryOrder)) {
            return NextResponse.json({ error: 'Invalid category order' }, { status: 400 });
        }

        // Update each category's order
        await Promise.all(
            categoryOrder.map(({ id, order }: { id: number; order: number }) =>
                db
                    .update(forumCategories)
                    .set({ orderIndex: order })
                    .where(eq(forumCategories.id, id))
            )
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Error reordering categories:', error);
        return NextResponse.json({ error: 'Failed to reorder categories' }, { status: 500 });
    }
}

