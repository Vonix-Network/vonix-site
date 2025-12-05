import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users, setupStatus } from '@/db/schema';
import { eq } from 'drizzle-orm';

// DEV-ONLY helper to recreate the admin user from setup_status if it was lost during migrations.
// Protected by NODE_ENV and API_SECRET_KEY. Remove this file once you have repaired your admin.

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!process.env.API_SECRET_KEY) {
    return NextResponse.json({ error: 'API_SECRET_KEY is not configured' }, { status: 500 });
  }

  if (!token || token !== process.env.API_SECRET_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { password, email } = body as { password?: string; email?: string };

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'Password (min 8 chars) is required in JSON body' },
        { status: 400 },
      );
    }

    const [statusRow] = await db.select().from(setupStatus).limit(1);

    if (!statusRow || !statusRow.adminUsername) {
      return NextResponse.json(
        { error: 'No setup_status row with adminUsername found' },
        { status: 400 },
      );
    }

    const adminUsername = statusRow.adminUsername;

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, adminUsername))
      .limit(1);

    if (existingUser) {
      return NextResponse.json({ ok: true, message: 'Admin user already exists in users table', userId: existingUser.id });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [newAdmin] = await db
      .insert(users)
      .values({
        username: adminUsername,
        email: email || null,
        password: hashedPassword,
        role: 'superadmin',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    console.log('🔐 Dev repair: recreated admin user from setup_status', {
      adminUsername,
      userId: newAdmin?.id,
    });

    return NextResponse.json({ ok: true, userId: newAdmin.id, username: adminUsername });
  } catch (error) {
    console.error('Dev repair-admin error:', error);
    return NextResponse.json({ error: 'Failed to repair admin user' }, { status: 500 });
  }
}
