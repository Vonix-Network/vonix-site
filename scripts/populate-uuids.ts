/**
 * Script to populate missing Minecraft UUIDs and usernames
 * 
 * This script:
 * 1. Sets minecraftUsername = username for users where minecraftUsername is NULL
 * 2. Finds all users missing minecraftUuid
 * 3. Looks up their UUID from Mojang API based on minecraftUsername
 * 4. Updates the database with the UUID
 * 
 * Run with: npx tsx scripts/populate-uuids.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local BEFORE anything else
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Show database configuration
console.log('📦 Database Configuration:');
console.log(`  URL: ${process.env.DATABASE_URL || 'file:./data/vonix.db (default)'}`);
console.log(`  Auth Token: ${process.env.DATABASE_AUTH_TOKEN ? '****' + process.env.DATABASE_AUTH_TOKEN.slice(-8) : 'Not set'}`);
console.log('');

// Now import db after env is loaded
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { users } from '../src/db/schema';
import { isNull, eq } from 'drizzle-orm';

// Create database client with loaded env vars
const client = createClient({
    url: process.env.DATABASE_URL || 'file:./data/vonix.db',
    authToken: process.env.DATABASE_AUTH_TOKEN,
});

const db = drizzle(client);

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
    console.log('='.repeat(60));
    console.log('🔧 STEP 1: Copy username to minecraftUsername where missing');
    console.log('='.repeat(60) + '\n');

    // First, find users where minecraftUsername is NULL but username exists
    const usersWithoutMcUsername = await db
        .select({
            id: users.id,
            username: users.username,
            minecraftUsername: users.minecraftUsername,
        })
        .from(users)
        .where(isNull(users.minecraftUsername));

    console.log(`📊 Found ${usersWithoutMcUsername.length} users without minecraftUsername\n`);

    let usernamesCopied = 0;
    for (const user of usersWithoutMcUsername) {
        if (user.username) {
            console.log(`  Copying username "${user.username}" to minecraftUsername for user ID ${user.id}`);
            await db
                .update(users)
                .set({
                    minecraftUsername: user.username,
                    updatedAt: new Date()
                })
                .where(eq(users.id, user.id));
            usernamesCopied++;
        }
    }

    console.log(`\n✅ Copied ${usernamesCopied} usernames to minecraftUsername\n`);

    console.log('='.repeat(60));
    console.log('🔍 STEP 2: Populate missing UUIDs from Mojang API');
    console.log('='.repeat(60) + '\n');

    // Now find all users missing minecraftUuid (they should now all have minecraftUsername)
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
        // Use minecraftUsername (should be set now), fallback to username just in case
        const lookupName = user.minecraftUsername || user.username;

        if (!lookupName) {
            console.log(`[${updated + skipped + failed + 1}/${usersToUpdate.length}] User ID ${user.id} has no username - skipping`);
            skipped++;
            continue;
        }

        console.log(`[${updated + skipped + failed + 1}/${usersToUpdate.length}] Processing: ${user.username}`);
        console.log(`  Looking up: "${lookupName}"`);

        const profile = await fetchMinecraftUUID(lookupName);

        if (profile) {
            const formattedUuid = formatUUID(profile.id);

            // Prepare update data - also ensure minecraftUsername matches Mojang's case
            const updateData: Record<string, any> = {
                minecraftUuid: formattedUuid,
                minecraftUsername: profile.name, // Use correct capitalization from Mojang
                updatedAt: new Date(),
            };

            await db
                .update(users)
                .set(updateData)
                .where(eq(users.id, user.id));

            console.log(`  ✅ Updated UUID: ${formattedUuid} (MC Username: ${profile.name})`);
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

    console.log('\n' + '='.repeat(60));
    console.log('📊 Final Summary:');
    console.log('='.repeat(60));
    console.log(`  📝 Usernames copied:  ${usernamesCopied}`);
    console.log(`  ✅ UUIDs updated:     ${updated}`);
    console.log(`  ⏭️  Skipped:          ${skipped}`);
    console.log(`  ❌ Failed lookups:    ${failed}`);
    console.log('='.repeat(60));
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
