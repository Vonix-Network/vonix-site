/**
 * Minimal User Migration Script
 *
 * Migrates ONLY username, password, and created_at from source Turso to target Turso.
 * Reads connection info from user-migration-config.json.
 * All other fields use defaults from the new schema.
 *
 * Usage:
 *   npx tsx scripts/migrate-users-minimal.ts
 *   npx tsx scripts/migrate-users-minimal.ts --dry-run
 */

import { createClient } from '@libsql/client';
import * as fs from 'fs';
import * as path from 'path';

interface MigrationConfig {
  source: {
    url: string;
    authToken: string;
  };
  target: {
    url: string;
    authToken: string;
  };
  options: {
    dryRun: boolean;
    resetPasswords: boolean;
    defaultPassword: string;
  };
}

interface SourceUser {
  id: number;
  username: string;
  password: string;
  created_at: number;
}

async function main() {
  const dryRunArg = process.argv.includes('--dry-run');

  console.log('👤 Minimal User Migration (username, password, created_at only)\n');
  console.log('='.repeat(60));

  // Load config
  const configPath = path.join(__dirname, 'user-migration-config.json');

  if (!fs.existsSync(configPath)) {
    console.error(`❌ Config not found at: ${configPath}`);
    process.exit(1);
  }

  const config: MigrationConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const dryRun = dryRunArg || config.options.dryRun;

  if (dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made\n');
  }

  // Connect to source Turso
  console.log(`📂 Source: ${config.source.url.substring(0, 50)}...`);
  const sourceClient = createClient({
    url: config.source.url,
    authToken: config.source.authToken,
  });

  // Test source connection
  try {
    await sourceClient.execute('SELECT 1');
    console.log('   ✅ Source connected');
  } catch (error: any) {
    console.error(`   ❌ Source connection failed: ${error.message}`);
    process.exit(1);
  }

  // Connect to target Turso
  console.log(`☁️  Target: ${config.target.url.substring(0, 50)}...`);
  const targetClient = createClient({
    url: config.target.url,
    authToken: config.target.authToken,
  });

  // Test target connection
  try {
    await targetClient.execute('SELECT 1');
    console.log('   ✅ Target connected\n');
  } catch (error: any) {
    console.error(`   ❌ Target connection failed: ${error.message}`);
    process.exit(1);
  }

  // Fetch users from source DB
  const result = await sourceClient.execute(`
    SELECT id, username, password, created_at
    FROM users
    ORDER BY id
  `);

  const sourceUsers: SourceUser[] = result.rows.map(row => ({
    id: row.id as number,
    username: row.username as string,
    password: row.password as string,
    created_at: row.created_at as number,
  }));

  console.log(`📥 Found ${sourceUsers.length} users in source database\n`);

  if (sourceUsers.length === 0) {
    console.log('✨ No users to migrate!');
    return;
  }

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of sourceUsers) {
    try {
      // Check if user already exists in target
      const existing = await targetClient.execute({
        sql: 'SELECT id FROM users WHERE username = ?',
        args: [user.username],
      });

      if (existing.rows.length > 0) {
        console.log(`   ⏭️  Skip: ${user.username} (already exists)`);
        skipped++;
        continue;
      }

      if (dryRun) {
        console.log(`   [DRY] Would migrate: ${user.username}`);
        migrated++;
        continue;
      }

      // Insert with only essential fields - let schema defaults handle the rest
      const now = Math.floor(Date.now() / 1000);
      await targetClient.execute({
        sql: `
          INSERT INTO users (username, password, role, created_at, updated_at)
          VALUES (?, ?, 'user', ?, ?)
        `,
        args: [
          user.username,
          user.password,
          user.created_at || now,
          now,
        ],
      });

      console.log(`   ✅ Migrated: ${user.username}`);
      migrated++;
    } catch (error: any) {
      console.error(`   ❌ Error: ${user.username} - ${error.message}`);
      errors++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary');
  console.log('='.repeat(60));
  console.log(`   ✅ Migrated: ${migrated}`);
  console.log(`   ⏭️  Skipped:  ${skipped}`);
  console.log(`   ❌ Errors:   ${errors}`);

  if (dryRun) {
    console.log('\n⚠️  This was a DRY RUN. Remove --dry-run to apply changes.');
  }

  console.log('\n✨ Migration complete!');
}

main().catch(console.error);

