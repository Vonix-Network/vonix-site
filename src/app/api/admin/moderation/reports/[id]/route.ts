import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../../auth';
import { db } from '@/db';
import { reportedContent, auditLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function requireModerator() {
    const session = await auth();
    const user = session?.user as any;

    if (!session || !['admin', 'superadmin', 'moderator'].includes(user?.role)) {
        throw new Error('Unauthorized');
    }

    return user;
}

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * PUT /api/admin/moderation/reports/[id]
 * Update report status
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const adminUser = await requireModerator();
        const { id } = await params;
        const reportId = parseInt(id);
        const body = await request.json();
        const { status } = body;

        if (!status || !['pending', 'reviewed', 'dismissed', 'actioned'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const [updated] = await db
            .update(reportedContent)
            .set({
                status: status as 'pending' | 'reviewed' | 'dismissed' | 'actioned',
                reviewedBy: parseInt(adminUser.id),
                reviewedAt: new Date(),
            })
            .where(eq(reportedContent.id, reportId))
            .returning();

        if (!updated) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        // Log the action
        await db.insert(auditLogs).values({
            userId: adminUser.id,
            action: `report_${status}`,
            resource: 'report',
            resourceId: reportId.toString(),
            details: JSON.stringify({ contentType: updated.contentType, contentId: updated.contentId }),
        });

        return NextResponse.json({ success: true, report: updated });
    } catch (error: any) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Error updating report:', error);
        return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
    }
}
