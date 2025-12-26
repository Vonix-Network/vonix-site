import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import { db } from '@/db';
import { apiKeys } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const user = session?.user as any;

    if (!session || !['admin', 'superadmin'].includes(user?.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const keyId = parseInt(id);

    if (isNaN(keyId)) {
      return NextResponse.json(
        { error: 'Invalid key ID' },
        { status: 400 }
      );
    }

    await db.delete(apiKeys).where(eq(apiKeys.id, keyId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting API key:', error);
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}
