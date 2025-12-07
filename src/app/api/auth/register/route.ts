import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users, registrationCodes } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { sendAdminNewUserAlert } from '@/lib/email';

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const maxRequests = 1000; // 1000 registrations per hour per IP (very generous for high traffic)

  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') || 'unknown';

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password, registrationCode } = body;

    // Validate required fields
    if (!password || !registrationCode) {
      return NextResponse.json(
        { error: 'Password and registration code are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordChecks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const passedChecks = Object.values(passwordChecks).filter(Boolean).length;
    if (passedChecks < 4) {
      return NextResponse.json(
        { error: 'Password does not meet security requirements' },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Verify registration code first
    const code = await db.query.registrationCodes.findFirst({
      where: and(
        eq(registrationCodes.code, registrationCode),
        eq(registrationCodes.used, false)
      ),
    });

    if (!code) {
      return NextResponse.json(
        { error: 'Invalid or already used registration code' },
        { status: 400 }
      );
    }

    // Check if code is expired
    if (new Date(code.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Registration code has expired' },
        { status: 400 }
      );
    }

    // Check if Minecraft account is already registered by UUID
    const existingMcUser = await db.query.users.findFirst({
      where: eq(users.minecraftUuid, code.minecraftUuid),
    });

    if (existingMcUser) {
      return NextResponse.json(
        { error: 'This Minecraft account is already registered. Please use the login page instead.' },
        { status: 409 }
      );
    }

    // Check if there's an existing user with matching username (case-insensitive)
    // This handles imported users who have a website account but no Minecraft UUID linked
    const existingUsernameUser = await db.query.users.findFirst({
      where: sql`LOWER(${users.username}) = LOWER(${code.minecraftUsername})`,
    });

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (existingEmail && existingEmail.id !== existingUsernameUser?.id) {
        return NextResponse.json(
          { error: 'Email already registered to a different account' },
          { status: 409 }
        );
      }
    }

    // Hash password with high cost factor for security
    const hashedPassword = await bcrypt.hash(password, 12);

    let finalUser;

    if (existingUsernameUser) {
      // User exists with same username - link their Minecraft account and update password
      console.log(`[Register] Linking Minecraft account to existing user: ${existingUsernameUser.username} (ID: ${existingUsernameUser.id})`);

      // Check if this existing user already has a DIFFERENT Minecraft account linked
      if (existingUsernameUser.minecraftUuid && existingUsernameUser.minecraftUuid !== code.minecraftUuid) {
        return NextResponse.json(
          { error: 'This website account is already linked to a different Minecraft account.' },
          { status: 409 }
        );
      }

      // Update the existing user with Minecraft info and new password
      await db.update(users)
        .set({
          minecraftUsername: code.minecraftUsername,
          minecraftUuid: code.minecraftUuid,
          password: hashedPassword,
          email: email || existingUsernameUser.email, // Keep existing email if not provided
        })
        .where(eq(users.id, existingUsernameUser.id));

      finalUser = {
        id: existingUsernameUser.id,
        username: existingUsernameUser.username,
        minecraftUsername: code.minecraftUsername,
      };

      console.log(`[Register] Successfully linked Minecraft account ${code.minecraftUsername} to user ID ${existingUsernameUser.id}`);
    } else {
      // Create new user (username is the Minecraft username)
      console.log(`[Register] Creating new user for: ${code.minecraftUsername}`);

      const [newUser] = await db.insert(users).values({
        username: code.minecraftUsername, // Use Minecraft username as the main username
        email: email || null,
        password: hashedPassword,
        minecraftUsername: code.minecraftUsername,
        minecraftUuid: code.minecraftUuid,
        role: 'user',
      }).returning();

      finalUser = {
        id: newUser.id,
        username: newUser.username,
        minecraftUsername: newUser.minecraftUsername,
      };

      console.log(`[Register] Successfully created new user: ${newUser.username} (ID: ${newUser.id})`);
    }

    // Mark registration code as used
    await db
      .update(registrationCodes)
      .set({
        used: true,
        userId: finalUser.id,
        usedAt: new Date(),
      })
      .where(eq(registrationCodes.id, code.id));

    // Send admin notification for new registration (async, don't wait)
    sendAdminNewUserAlert(finalUser.username, email || undefined)
      .catch(err => console.error('Failed to send admin new user alert:', err));

    // Return success (don't include sensitive data)
    return NextResponse.json({
      success: true,
      message: existingUsernameUser
        ? 'Minecraft account linked successfully! Your password has been updated.'
        : 'Account created successfully',
      user: finalUser,
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

