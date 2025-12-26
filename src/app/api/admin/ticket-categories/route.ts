import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/db';
import { ticketCategories, ticketQuestions } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

/**
 * GET /api/admin/ticket-categories
 * Get all ticket categories
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;
        if (!['admin', 'superadmin'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const categories = await db
            .select()
            .from(ticketCategories)
            .orderBy(asc(ticketCategories.order));

        return NextResponse.json({ categories });
    } catch (error: any) {
        console.error('Error fetching ticket categories:', error);
        return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }
}

/**
 * POST /api/admin/ticket-categories
 * Create a new ticket category
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;
        if (!['admin', 'superadmin'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const {
            name,
            description,
            emoji,
            color,
            discordCategoryId,
            staffRoles,
            pingRoles,
            openingMessage,
            requireTopic,
            memberLimit,
            totalLimit,
            cooldown,
            enabled,
            order,
        } = body;

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const [category] = await db.insert(ticketCategories).values({
            name,
            description,
            emoji: emoji || '🎫',
            color: color || '#00FFFF',
            discordCategoryId,
            staffRoles: staffRoles ? JSON.stringify(staffRoles) : null,
            pingRoles: pingRoles ? JSON.stringify(pingRoles) : null,
            openingMessage,
            requireTopic: requireTopic || false,
            memberLimit: memberLimit || 3,
            totalLimit: totalLimit || 50,
            cooldown,
            enabled: enabled !== false,
            order: order || 0,
        }).returning();

        return NextResponse.json({ success: true, category });
    } catch (error: any) {
        console.error('Error creating ticket category:', error);
        return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
    }
}

/**
 * PUT /api/admin/ticket-categories
 * Update a ticket category
 */
export async function PUT(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;
        if (!['admin', 'superadmin'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { id, ...data } = body;

        if (!id) {
            return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
        }

        // Prepare update data
        const updateData: any = { updatedAt: new Date() };
        
        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.emoji !== undefined) updateData.emoji = data.emoji;
        if (data.color !== undefined) updateData.color = data.color;
        if (data.discordCategoryId !== undefined) updateData.discordCategoryId = data.discordCategoryId;
        if (data.staffRoles !== undefined) updateData.staffRoles = JSON.stringify(data.staffRoles);
        if (data.pingRoles !== undefined) updateData.pingRoles = JSON.stringify(data.pingRoles);
        if (data.openingMessage !== undefined) updateData.openingMessage = data.openingMessage;
        if (data.requireTopic !== undefined) updateData.requireTopic = data.requireTopic;
        if (data.memberLimit !== undefined) updateData.memberLimit = data.memberLimit;
        if (data.totalLimit !== undefined) updateData.totalLimit = data.totalLimit;
        if (data.cooldown !== undefined) updateData.cooldown = data.cooldown;
        if (data.enabled !== undefined) updateData.enabled = data.enabled;
        if (data.order !== undefined) updateData.order = data.order;

        const [category] = await db
            .update(ticketCategories)
            .set(updateData)
            .where(eq(ticketCategories.id, id))
            .returning();

        return NextResponse.json({ success: true, category });
    } catch (error: any) {
        console.error('Error updating ticket category:', error);
        return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/ticket-categories
 * Delete a ticket category
 */
export async function DELETE(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;
        if (!['admin', 'superadmin'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
        }

        await db.delete(ticketCategories).where(eq(ticketCategories.id, parseInt(id)));

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting ticket category:', error);
        return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
    }
}
