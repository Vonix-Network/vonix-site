import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, apiKeys } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { formatUUID } from '@/lib/minecraft';

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
 * GET /api/minecraft/verify?uuid=<uuid>
 * Verify a player's account and get their info
 * Used by the Minecraft mod to check player status
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
    let uuid = searchParams.get('uuid');
    const username = searchParams.get('username');

    if (!uuid && !username) {
      return NextResponse.json(
        { error: 'UUID or username parameter required' },
        { status: 400 }
      );
    }

    // Normalize UUID format (ensure it has dashes)
    if (uuid) {
      uuid = formatUUID(uuid);
    }

    // Find user by Minecraft UUID first, then by username
    console.log(`[Verify] Looking up user - UUID: ${uuid}, Username: ${username}`);

    let user = null;

    // 1. Try by Minecraft UUID
    if (uuid) {
      user = await db.query.users.findFirst({
        where: eq(users.minecraftUuid, uuid),
      });
      if (user) {
        console.log(`[Verify] Found user by UUID: ${user.username} (ID: ${user.id})`);
      }
    }

    // 2. Try by Minecraft username field (case-insensitive)
    if (!user && username) {
      user = await db.query.users.findFirst({
        where: sql`LOWER(${users.minecraftUsername}) = LOWER(${username})`,
      });
      if (user) {
        console.log(`[Verify] Found user by Minecraft username: ${user.username} (ID: ${user.id})`);
      }
    }

    // 3. Try by website username (for imported users) - case-insensitive
    if (!user && username) {
      user = await db.query.users.findFirst({
        where: sql`LOWER(${users.username}) = LOWER(${username})`,
      });
      if (user) {
        console.log(`[Verify] Found user by website username: ${user.username} (ID: ${user.id})`);

        // Update the user's minecraft fields if they're missing
        if (!user.minecraftUuid && uuid) {
          console.log(`[Verify] Updating missing Minecraft fields for user ${user.username}`);
          await db.update(users)
            .set({
              minecraftUuid: uuid,
              minecraftUsername: username
            })
            .where(eq(users.id, user.id));
        }
      }
    }

    if (!user) {
      console.log(`[Verify] No user found for UUID: ${uuid}, Username: ${username}`);
      return NextResponse.json({
        verified: false,
        registered: false, // For mod compatibility
        message: 'Player not registered',
      });
    }

    console.log(`[Verify] Found user: ${user.username} (ID: ${user.id})`);
    return NextResponse.json({
      verified: true,
      registered: true, // For mod compatibility
      user: {
        id: user.id,
        username: user.username,
        minecraftUsername: user.minecraftUsername,
        minecraft_username: user.minecraftUsername, // snake_case for mod
        minecraft_uuid: user.minecraftUuid, // snake_case for mod
        role: user.role,
        level: user.level,
        xp: user.xp,
        donationRankId: user.donationRankId,
        donation_rank_id: user.donationRankId, // snake_case for mod
        rankExpiresAt: user.rankExpiresAt,
      },
    });

  } catch (error) {
    console.error('Player verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify player' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/minecraft/verify
 * Update player's last login from Minecraft
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { uuid, action } = body;

    if (!uuid) {
      return NextResponse.json(
        { error: 'UUID required' },
        { status: 400 }
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.minecraftUuid, uuid),
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'Player not registered',
      });
    }

    // Handle different actions
    if (action === 'login') {
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id));

      return NextResponse.json({
        success: true,
        message: 'Login recorded',
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });

  } catch (error) {
    console.error('Player action error:', error);
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    );
  }
}
