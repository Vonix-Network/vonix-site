import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, apiKeys, xpTransactions } from '@/db/schema';
import { eq } from 'drizzle-orm';

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

// Calculate level from XP
function calculateLevel(xp: number): number {
  // Simple formula: level = floor(sqrt(xp / 100)) + 1
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

/**
 * POST /api/minecraft/xp
 * Award XP to a player from in-game actions
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
    const { uuid, amount, source, description } = body;

    if (!uuid || !amount || !source) {
      return NextResponse.json(
        { error: 'UUID, amount, and source are required' },
        { status: 400 }
      );
    }

    if (typeof amount !== 'number' || amount <= 0 || amount > 1000) {
      return NextResponse.json(
        { error: 'Amount must be a positive number (max 1000)' },
        { status: 400 }
      );
    }

    // Find user by Minecraft UUID
    const user = await db.query.users.findFirst({
      where: eq(users.minecraftUuid, uuid),
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'Player not registered',
      });
    }

    const newXp = (user.xp || 0) + amount;
    const newLevel = calculateLevel(newXp);
    const leveledUp = newLevel > (user.level || 1);

    // Update user XP and level
    await db
      .update(users)
      .set({
        xp: newXp,
        level: newLevel,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Record XP transaction for history
    await db.insert(xpTransactions).values({
      userId: user.id,
      amount,
      source,
      description: description || `XP from ${source}`,
    });

    return NextResponse.json({
      success: true,
      xp: newXp,
      level: newLevel,
      leveledUp,
      message: leveledUp
        ? `Awarded ${amount} XP! Level up to ${newLevel}!`
        : `Awarded ${amount} XP`,
    });

  } catch (error) {
    console.error('XP award error:', error);
    return NextResponse.json(
      { error: 'Failed to award XP' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/minecraft/xp?uuid=<uuid>
 * Get player's XP and level
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

    const user = await db.query.users.findFirst({
      where: eq(users.minecraftUuid, uuid),
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'Player not registered',
      });
    }

    return NextResponse.json({
      success: true,
      xp: user.xp || 0,
      level: user.level || 1,
      title: user.title,
    });

  } catch (error) {
    console.error('XP fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch XP' },
      { status: 500 }
    );
  }
}

