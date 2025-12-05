import { NextResponse } from 'next/server';
import { db } from '@/db';
import { setupStatus } from '@/db/schema';

export async function GET() {
  try {
    const [status] = await db.select().from(setupStatus).limit(1);

    return NextResponse.json({
      isCompleted: status?.isCompleted || false,
      completedAt: status?.completedAt || null,
      version: status?.version || '4.0.0',
    });
  } catch (error) {
    // If table doesn't exist or error, assume setup not completed
    return NextResponse.json({
      isCompleted: false,
      completedAt: null,
      version: '4.0.0',
    });
  }
}
