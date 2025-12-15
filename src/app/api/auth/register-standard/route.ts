import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users, siteSettings } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { sendAdminNewUserAlert } from '@/lib/email';

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour
    const maxRequests = 100; // 100 registrations per hour per IP

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

/**
 * POST /api/auth/register-standard
 * Standard registration without Minecraft verification code
 * Only works when require_registration_code setting is false
 */
export async function POST(request: NextRequest) {
    try {
        // Check if standard registration is allowed
        const [requireCodeSetting] = await db
            .select()
            .from(siteSettings)
            .where(eq(siteSettings.key, 'require_registration_code'));

        if (requireCodeSetting?.value !== 'false') {
            return NextResponse.json(
                { error: 'Standard registration is not enabled. Please use Minecraft verification.' },
                { status: 403 }
            );
        }

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
        const { username, email, password, minecraftUsername, avatar } = body;

        // Validate required fields
        if (!username || !password) {
            return NextResponse.json(
                { error: 'Username and password are required' },
                { status: 400 }
            );
        }

        // Validate username format
        if (username.length < 3 || username.length > 20) {
            return NextResponse.json(
                { error: 'Username must be between 3 and 20 characters' },
                { status: 400 }
            );
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return NextResponse.json(
                { error: 'Username can only contain letters, numbers, and underscores' },
                { status: 400 }
            );
        }

        // Validate Minecraft username format if provided
        if (minecraftUsername) {
            if (minecraftUsername.length < 3 || minecraftUsername.length > 16) {
                return NextResponse.json(
                    { error: 'Minecraft username must be between 3 and 16 characters' },
                    { status: 400 }
                );
            }

            if (!/^[a-zA-Z0-9_]+$/.test(minecraftUsername)) {
                return NextResponse.json(
                    { error: 'Minecraft username can only contain letters, numbers, and underscores' },
                    { status: 400 }
                );
            }
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

        // Validate avatar URL format if provided
        if (avatar && !avatar.startsWith('https://')) {
            return NextResponse.json(
                { error: 'Avatar URL must be a valid HTTPS URL' },
                { status: 400 }
            );
        }

        // Check if username already exists (case-insensitive)
        const existingUsername = await db.query.users.findFirst({
            where: sql`LOWER(${users.username}) = LOWER(${username})`,
        });

        if (existingUsername) {
            return NextResponse.json(
                { error: 'Username is already taken' },
                { status: 409 }
            );
        }

        // Check if email already exists (if provided)
        if (email) {
            const existingEmail = await db.query.users.findFirst({
                where: eq(users.email, email),
            });

            if (existingEmail) {
                return NextResponse.json(
                    { error: 'Email is already registered' },
                    { status: 409 }
                );
            }
        }

        // Hash password with high cost factor for security
        const hashedPassword = await bcrypt.hash(password, 12);

        // Determine minecraftUsername for the user
        // If provided, use it. Otherwise, leave null (profile will use default "Maid" skin)
        const finalMinecraftUsername = minecraftUsername?.trim() || null;

        // Create new user
        const [newUser] = await db.insert(users).values({
            username: username.trim(),
            email: email || null,
            password: hashedPassword,
            role: 'user',
            minecraftUsername: finalMinecraftUsername,
            avatar: avatar?.trim() || null,
        }).returning();

        console.log(`[Register-Standard] Successfully created new user: ${newUser.username} (ID: ${newUser.id})`);

        // Send admin notification for new registration (async, don't wait)
        sendAdminNewUserAlert(newUser.username, email || undefined)
            .catch(err => console.error('Failed to send admin new user alert:', err));

        // Return success (don't include sensitive data)
        return NextResponse.json({
            success: true,
            message: 'Account created successfully',
            user: {
                id: newUser.id,
                username: newUser.username,
            },
        });

    } catch (error) {
        console.error('Standard registration error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
