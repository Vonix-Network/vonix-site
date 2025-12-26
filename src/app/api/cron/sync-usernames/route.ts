import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, isNotNull } from 'drizzle-orm';
import { fetchMinecraftUsername } from '@/lib/minecraft';

/**
 * GET /api/cron/sync-usernames
 * Hourly cron job to sync Minecraft usernames based on UUIDs
 * This catches username changes (player changed their IGN)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if configured
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    console.log('🔄 Starting username sync...');

    // Get all users with Minecraft UUIDs
    const allUsers = await db
      .select({
        id: users.id,
        username: users.username,
        minecraftUsername: users.minecraftUsername,
        minecraftUuid: users.minecraftUuid,
      })
      .from(users)
      .where(isNotNull(users.minecraftUuid));

    console.log(`Found ${allUsers.length} users with Minecraft UUIDs`);

    let syncedCount = 0;
    let unchangedCount = 0;
    let errorCount = 0;
    const changes: Array<{ userId: number; oldUsername: string; newUsername: string }> = [];

    // Process each user
    for (const user of allUsers) {
      try {
        if (!user.minecraftUuid) continue;

        // Fetch current username from Mojang
        const currentUsername = await fetchMinecraftUsername(user.minecraftUuid);

        if (!currentUsername) {
          console.warn(`⚠️ Could not fetch username for UUID: ${user.minecraftUuid}`);
          errorCount++;
          continue;
        }

        // Check if username changed
        if (currentUsername !== user.minecraftUsername) {
          console.log(`🔄 Username change detected for user ${user.id}:`);
          console.log(`   ${user.minecraftUsername} -> ${currentUsername}`);

          // Update database with new username
          await db
            .update(users)
            .set({
              minecraftUsername: currentUsername,
              // Also update the main username field to match
              username: currentUsername,
              updatedAt: new Date(),
            })
            .where(eq(users.id, user.id));

          changes.push({
            userId: user.id,
            oldUsername: user.minecraftUsername || 'unknown',
            newUsername: currentUsername,
          });

          syncedCount++;
        } else {
          unchangedCount++;
        }

        // Rate limit to avoid hitting Mojang API too hard
        // Sleep 100ms between requests (max 10 req/sec)
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        console.error(`Error syncing user ${user.id}:`, error);
        errorCount++;
      }
    }

    console.log(`✅ Username sync complete:`);
    console.log(`   - Synced: ${syncedCount}`);
    console.log(`   - Unchanged: ${unchangedCount}`);
    console.log(`   - Errors: ${errorCount}`);

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      unchanged: unchangedCount,
      errors: errorCount,
      total: allUsers.length,
      changes,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Username sync error:', error);
    return NextResponse.json(
      { error: 'Username sync failed' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/sync-usernames
 * Manual trigger for username sync (for testing or manual execution)
 */
export async function POST(request: NextRequest) {
  // Same logic as GET
  return GET(request);
}

