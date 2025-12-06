import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { registrationCodes, apiKeys, users } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { fetchMinecraftUUID, formatUUID } from '@/lib/minecraft';

// Verify API key from Minecraft server/mod
async function verifyApiKey(apiKey: string): Promise<boolean> {
  if (!apiKey) return false;
  
  try {
    const key = await db.query.apiKeys.findFirst({
      where: eq(apiKeys.key, apiKey),
    });
    return !!key;
  } catch {
    return false;
  }
}

// Generate a unique registration code
function generateRegistrationCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

/**
 * POST /api/minecraft/register
 * Called by the Minecraft mod when a player runs /register in-game
 * Creates a registration code that the player uses on the website
 */
export async function POST(request: NextRequest) {
  try {
    // Verify API key
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }

    const isValidKey = await verifyApiKey(apiKey);
    if (!isValidKey) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 403 }
      );
    }

    const body = await request.json();
    // Accept both snake_case (from mod) and camelCase
    let minecraftUsername = body.minecraft_username || body.minecraftUsername;
    let minecraftUuid = body.minecraft_uuid || body.minecraftUuid;

    if (!minecraftUsername) {
      return NextResponse.json(
        { error: 'Minecraft username is required' },
        { status: 400 }
      );
    }

    // Validate username exists via Mojang API
    console.log(`Validating Minecraft username: ${minecraftUsername}`);
    const profile = await fetchMinecraftUUID(minecraftUsername);
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Invalid Minecraft username. Please check your username and try again.' },
        { status: 400 }
      );
    }

    // Use the validated data from Mojang
    minecraftUsername = profile.name; // Use the correct capitalization from Mojang
    minecraftUuid = formatUUID(profile.id); // Format UUID with dashes

    console.log(`Validated: ${minecraftUsername} -> ${minecraftUuid}`);

    // FIRST: Check if this Minecraft account is already registered in the users table
    // Check by BOTH UUID and username since imported users may not have UUID
    let existingUser = await db.query.users.findFirst({
      where: eq(users.minecraftUuid, minecraftUuid),
    });

    // Also check by minecraftUsername (case-insensitive)
    if (!existingUser) {
      existingUser = await db.query.users.findFirst({
        where: sql`LOWER(${users.minecraftUsername}) = LOWER(${minecraftUsername})`,
      });
    }

    // Also check if website username matches minecraft username (for imported users) - case-insensitive
    if (!existingUser) {
      existingUser = await db.query.users.findFirst({
        where: sql`LOWER(${users.username}) = LOWER(${minecraftUsername})`,
      });
    }

    if (existingUser) {
      console.log(`Player ${minecraftUsername} is already registered with user ID ${existingUser.id} (username: ${existingUser.username})`);

      // If user exists but doesn't have UUID, update it now
      if (!existingUser.minecraftUuid) {
        console.log(`Updating missing UUID for user ${existingUser.username}`);
        await db.update(users)
          .set({
            minecraftUuid: minecraftUuid,
            minecraftUsername: minecraftUsername
          })
          .where(eq(users.id, existingUser.id));
      }

      // Check if user has a valid bcrypt password
      const hasValidPassword = existingUser.password && existingUser.password.startsWith('$2');

      if (hasValidPassword) {
        return NextResponse.json({
          error: 'This Minecraft account is already registered. Use /login <password> to authenticate.',
          already_registered: true,
        }, { status: 409 });
      } else {
        // User exists but has no valid password - they need to set one
        // Generate a registration code so they can set their password on the website
        console.log(`User ${existingUser.username} has no valid password, generating code for password setup`);

        // Continue to generate a registration code for them
        // The website registration will link their account and set their password
      }
    }

    // Check if there's already an unused code for this player
    const existingCode = await db.query.registrationCodes.findFirst({
      where: eq(registrationCodes.minecraftUuid, minecraftUuid),
    });

    if (existingCode && !existingCode.used) {
      // Check if code is still valid (not expired)
      if (new Date(existingCode.expiresAt) > new Date()) {
        return NextResponse.json({
          success: true,
          code: existingCode.code,
          expiresAt: existingCode.expiresAt,
          expires_in: Math.floor((new Date(existingCode.expiresAt).getTime() - Date.now()) / 1000),
          minecraftUsername: minecraftUsername,
          minecraftUuid: minecraftUuid,
          minecraft_username: minecraftUsername,
          minecraft_uuid: minecraftUuid,
          message: 'Existing registration code retrieved',
        });
      }
    }

    // Generate new registration code
    const code = generateRegistrationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Insert new registration code
    const [newCode] = await db.insert(registrationCodes).values({
      code,
      minecraftUsername,
      minecraftUuid,
      expiresAt,
      used: false,
    }).returning();

    return NextResponse.json({
      success: true,
      code: newCode.code,
      expiresAt: newCode.expiresAt,
      expires_in: 900, // 15 minutes in seconds (for mod compatibility)
      // Include both camelCase and snake_case for compatibility
      minecraftUsername: minecraftUsername,
      minecraftUuid: minecraftUuid,
      minecraft_username: minecraftUsername,
      minecraft_uuid: minecraftUuid,
      message: `Registration code generated for ${minecraftUsername}. Use this code on the website to complete registration. Code expires in 15 minutes.`,
    });

  } catch (error) {
    console.error('Minecraft registration error:', error);
    return NextResponse.json(
      { error: 'Failed to generate registration code' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/minecraft/register?uuid=<uuid>
 * Check if a player is registered
 */
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }

    const isValidKey = await verifyApiKey(apiKey);
    if (!isValidKey) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const uuid = searchParams.get('uuid');

    if (!uuid) {
      return NextResponse.json(
        { error: 'UUID parameter required' },
        { status: 400 }
      );
    }

    // Check if player is registered in the users table (primary check)
    const existingUser = await db.query.users.findFirst({
      where: eq(users.minecraftUuid, uuid),
    });

    if (existingUser) {
      return NextResponse.json({
        registered: true,
        userId: existingUser.id,
        username: existingUser.username,
      });
    }

    return NextResponse.json({
      registered: false,
    });

  } catch (error) {
    console.error('Registration check error:', error);
    return NextResponse.json(
      { error: 'Failed to check registration status' },
      { status: 500 }
    );
  }
}

