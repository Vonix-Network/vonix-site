import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, registrationCodes, apiKeys, donationRanks } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
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

/**
 * POST /api/minecraft/register-direct
 * Allows players to register directly from the Minecraft mod with /register <password>
 * Creates a user account and links it to their Minecraft account
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
    let { minecraft_username, minecraft_uuid, password } = body;

    // Also accept camelCase
    minecraft_username = minecraft_username || body.minecraftUsername;
    minecraft_uuid = minecraft_uuid || body.minecraftUuid;

    if (!minecraft_username) {
      return NextResponse.json(
        { error: 'Minecraft username is required' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Validate username exists via Mojang API
    console.log(`Validating Minecraft username for direct registration: ${minecraft_username}`);
    const profile = await fetchMinecraftUUID(minecraft_username);
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Invalid Minecraft username. Please check your username and try again.' },
        { status: 400 }
      );
    }

    // Use the validated data from Mojang
    minecraft_username = profile.name;
    minecraft_uuid = formatUUID(profile.id);
    
    console.log(`Validated for direct registration: ${minecraft_username} -> ${minecraft_uuid}`);

    // Check if user already exists with this Minecraft UUID
    let existingUser = await db.query.users.findFirst({
      where: eq(users.minecraftUuid, minecraft_uuid),
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: 'This Minecraft account is already registered. Use /login <password> instead.',
          already_registered: true,
        },
        { status: 400 }
      );
    }

    // Also check by minecraft username (case-insensitive)
    if (!existingUser) {
      existingUser = await db.query.users.findFirst({
        where: sql`LOWER(${users.minecraftUsername}) = LOWER(${minecraft_username})`,
      });

      if (existingUser) {
        return NextResponse.json(
          {
            error: 'This Minecraft account is already registered. Use /login <password> instead.',
            already_registered: true,
          },
          { status: 400 }
        );
      }
    }

    // Check if username is already taken by a website user (imported user) - case-insensitive
    const existingUsername = await db.query.users.findFirst({
      where: sql`LOWER(${users.username}) = LOWER(${minecraft_username})`,
    });

    // Hash password first (we'll need it either way)
    const hashedPassword = await bcrypt.hash(password, 12);

    // If there's an existing user with this username, update them instead of creating new
    if (existingUsername) {
      // Check if this user already has a different Minecraft account linked
      if (existingUsername.minecraftUuid && existingUsername.minecraftUuid !== minecraft_uuid) {
        return NextResponse.json(
          { error: 'This website account is already linked to a different Minecraft account.' },
          { status: 400 }
        );
      }

      // Update the existing user with Minecraft info and new password
      console.log(`Updating existing user ${existingUsername.username} with Minecraft account ${minecraft_username}`);

      await db.update(users)
        .set({
          minecraftUsername: minecraft_username,
          minecraftUuid: minecraft_uuid,
          password: hashedPassword, // Update password for direct registration
        })
        .where(eq(users.id, existingUsername.id));

      // Mark any existing registration codes as used
      await db.update(registrationCodes)
        .set({
          used: true,
          userId: existingUsername.id,
          usedAt: new Date(),
        })
        .where(
          and(
            eq(registrationCodes.minecraftUuid, minecraft_uuid),
            eq(registrationCodes.used, false)
          )
        );

      // Fetch donation rank if any
      let donationRank = null;
      if (existingUsername.donationRankId) {
        donationRank = await db.query.donationRanks.findFirst({
          where: eq(donationRanks.id, existingUsername.donationRankId),
        });
      }

      console.log(`Direct registration updated existing user ${minecraft_username}`);

      return NextResponse.json({
        success: true,
        message: `Account linked and password set for ${minecraft_username}`,
        user: {
          id: existingUsername.id,
          username: existingUsername.username,
          minecraft_username: minecraft_username,
          minecraft_uuid: minecraft_uuid,
          role: existingUsername.role,
          total_donated: existingUsername.totalDonated || 0,
          donation_rank_id: existingUsername.donationRankId,
          donation_rank: donationRank ? {
            id: donationRank.id,
            name: donationRank.name,
            color: donationRank.color,
            expires_at: existingUsername.rankExpiresAt?.toISOString() || null,
          } : null,
        },
      }, { status: 200 });
    }

    // Create the user
    const [newUser] = await db.insert(users).values({
      username: minecraft_username,
      password: hashedPassword,
      minecraftUsername: minecraft_username,
      minecraftUuid: minecraft_uuid,
      role: 'user',
    }).returning();

    // Mark any existing registration codes for this player as used
    await db.update(registrationCodes)
      .set({ 
        used: true, 
        userId: newUser.id,
        usedAt: new Date(),
      })
      .where(
        and(
          eq(registrationCodes.minecraftUuid, minecraft_uuid),
          eq(registrationCodes.used, false)
        )
      );

    // Fetch donation rank if any
    let donationRank = null;
    if (newUser.donationRankId) {
      donationRank = await db.query.donationRanks.findFirst({
        where: eq(donationRanks.id, newUser.donationRankId),
      });
    }

    console.log(`Direct registration successful for ${minecraft_username}`);

    return NextResponse.json({
      success: true,
      message: `Account created successfully for ${minecraft_username}`,
      user: {
        id: newUser.id,
        username: newUser.username,
        minecraft_username: newUser.minecraftUsername,
        minecraft_uuid: newUser.minecraftUuid,
        role: newUser.role,
        total_donated: newUser.totalDonated || 0,
        donation_rank_id: newUser.donationRankId,
        donation_rank: donationRank ? {
          id: donationRank.id,
          name: donationRank.name,
          color: donationRank.color,
          expires_at: newUser.rankExpiresAt?.toISOString() || null,
        } : null,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Direct registration error:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}

