import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        username: true,
        minecraftUsername: true,
        minecraftUuid: true,
        avatar: true,
        bio: true,
        role: true,
        xp: true,
        level: true,
        title: true,
        createdAt: true,
        lastLoginAt: true,
        // Exclude sensitive fields
        password: false,
        email: false,
        twoFactorSecret: false,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const userId = parseInt(id);
    const currentUserId = parseInt(session.user.id as string);
    const userRole = (session.user as any).role;

    // Only allow users to update their own profile, or admins to update any
    if (userId !== currentUserId && !['admin', 'superadmin'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { bio, email, preferredBackground, avatar } = body;

    // Validate bio length
    if (bio && bio.length > 200) {
      return NextResponse.json(
        { error: 'Bio must be 200 characters or less' },
        { status: 400 }
      );
    }

    // Validate email format
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Basic avatar URL validation (optional field)
    if (avatar && typeof avatar === 'string') {
      const trimmed = avatar.trim();
      if (trimmed.length > 0 && !/^https?:\/\//i.test(trimmed)) {
        return NextResponse.json(
          { error: 'Avatar URL must start with http:// or https://' },
          { status: 400 }
        );
      }
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        bio,
        email,
        avatar: avatar === undefined ? users.avatar : avatar || null,
        preferredBackground,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        username: users.username,
        bio: users.bio,
        email: users.email,
        avatar: users.avatar,
      });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
