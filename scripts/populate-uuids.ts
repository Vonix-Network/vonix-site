/**
 * Script to populate missing Minecraft UUIDs for users
 * 
 * This script:
 * 1. Finds all users missing minecraftUuid
 * 2. Looks up their UUID from Mojang API based on username/minecraftUsername
 * 3. Updates the database with the UUID
 * 4. Sets minecraftUsername to username if not set
 * 
 * Run with: npx tsx scripts/populate-uuids.ts
 */

import { db } from '../src/db';
import { users } from '../src/db/schema';
import { isNull, or, eq } from 'drizzle-orm';

const MOJANG_API_URL = 'https://api.mojang.com/users/profiles/minecraft';

// Rate limit delay (Mojang API has rate limits)
const DELAY_MS = 1000;

function formatUUID(uuid: string): string {
    // Remove any existing dashes and convert to standard format
    const clean = uuid.replace(/-/g, '');
    return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
}

async function fetchMinecraftUUID(username: string): Promise<{ id: string; name: string } | null> {
    try {
        const response = await fetch(`${MOJANG_API_URL}/${encodeURIComponent(username)}`);

        if (response.status === 404) {
            console.log(`  ⚠️  Username "${username}" not found on Mojang API`);
            return null;
        }

        if (!response.ok) {
            console.log(`  ❌ API error for "${username}": ${response.status}`);
            return null;
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.log(`  ❌ Failed to fetch UUID for "${username}":`, error);
        return null;
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log('🔍 Finding users with missing UUIDs...\n');

    // Find all users missing minecraftUuid
    const usersToUpdate = await db
        .select({
            id: users.id,
            username: users.username,
            minecraftUsername: users.minecraftUsername,
            minecraftUuid: users.minecraftUuid,
        })
        .from(users)
        .where(isNull(users.minecraftUuid));

    console.log(`📊 Found ${usersToUpdate.length} users without UUIDs\n`);

    if (usersToUpdate.length === 0) {
        console.log('✅ All users already have UUIDs!');
        return;
    }

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const user of usersToUpdate) {
        // Determine which username to use for lookup
        const lookupName = user.minecraftUsername || user.username;

        console.log(`[${updated + skipped + failed + 1}/${usersToUpdate.length}] Processing: ${user.username}`);
        console.log(`  Looking up: "${lookupName}"`);

        const profile = await fetchMinecraftUUID(lookupName);

        if (profile) {
            const formattedUuid = formatUUID(profile.id);

            // Prepare update data
            const updateData: Record<string, any> = {
                minecraftUuid: formattedUuid,
                updatedAt: new Date(),
            };

            // Also set minecraftUsername if not set
            if (!user.minecraftUsername) {
                updateData.minecraftUsername = profile.name; // Use correct capitalization from Mojang
                console.log(`  Setting minecraftUsername: ${profile.name}`);
            }

            await db
                .update(users)
                .set(updateData)
                .where(eq(users.id, user.id));

            console.log(`  ✅ Updated UUID: ${formattedUuid}`);
            updated++;
        } else {
            console.log(`  ⏭️  Skipped (no valid Minecraft account found)`);
            failed++;
        }

        // Rate limiting
        if (updated + skipped + failed < usersToUpdate.length) {
            await sleep(DELAY_MS);
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Summary:');
    console.log(`  ✅ Updated: ${updated}`);
    console.log(`  ⏭️  Skipped: ${skipped}`);
    console.log(`  ❌ Failed:  ${failed}`);
    console.log('='.repeat(50));
}

main()
    .then(() => {
        console.log('\n✅ Script completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });
