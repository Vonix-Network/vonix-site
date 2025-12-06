import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// DEV-ONLY helper to create/repair the admin user.
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
    const { username, password, email } = body as { username?: string; password?: string; email?: string };

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required in JSON body' },
        { status: 400 },
      );
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'Password (min 8 chars) is required in JSON body' },
        { status: 400 },
      );
    }

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existingUser) {
      // Update the existing user to be superadmin with new password
      const hashedPassword = await bcrypt.hash(password, 10);
      await db
        .update(users)
        .set({
          password: hashedPassword,
          role: 'superadmin',
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id));

      return NextResponse.json({ ok: true, message: 'Admin user updated', userId: existingUser.id });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [newAdmin] = await db
      .insert(users)
      .values({
        username,
        email: email || null,
        password: hashedPassword,
        role: 'superadmin',
        emailVerified: true,
      })
      .returning();

    console.log('🔐 Dev repair: created admin user', {
      username,
      userId: newAdmin?.id,
    });

    return NextResponse.json({ ok: true, userId: newAdmin.id, username });
  } catch (error) {
    console.error('Dev repair-admin error:', error);
    return NextResponse.json({ error: 'Failed to repair admin user' }, { status: 500 });
  }
}

