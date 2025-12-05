/**
 * User Migration Script
 * 
 * Simple script to migrate users from old Turso database to new one.
 * Focuses on essential user data only.
 * 
 * Usage:
 *   1. Set environment variables or create scripts/user-migration-config.json
 *   2. Run: npx tsx scripts/migrate-users.ts
 */

import { createClient } from '@libsql/client';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';

interface UserMigrationConfig {
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
    defaultPassword?: string;
  };
}

interface OldUser {
  id: number;
  username: string;
  email: string | null;
  password: string;
  role: string;
  minecraft_username: string | null;
  minecraft_uuid: string | null;
  avatar: string | null;
  bio: string | null;
  xp: number;
  level: number;
  title: string | null;
  donation_rank_id: string | null;
  total_donated: number;
  created_at: number;
}

async function loadConfig(): Promise<UserMigrationConfig> {
  const configPath = path.join(__dirname, 'user-migration-config.json');
  
  // Check for environment variables first
  if (process.env.SOURCE_DB_URL && process.env.TARGET_DB_URL) {
    return {
      source: {
        url: process.env.SOURCE_DB_URL,
        authToken: process.env.SOURCE_DB_AUTH_TOKEN || '',
      },
      target: {
        url: process.env.TARGET_DB_URL,
        authToken: process.env.TARGET_DB_AUTH_TOKEN || '',
      },
      options: {
        dryRun: process.env.DRY_RUN === 'true',
        resetPasswords: process.env.RESET_PASSWORDS === 'true',
        defaultPassword: process.env.DEFAULT_PASSWORD,
      },
    };
  }

  if (!fs.existsSync(configPath)) {
    console.log('Creating sample config file...');
    const sampleConfig: UserMigrationConfig = {
      source: {
        url: 'libsql://your-old-database.turso.io',
        authToken: 'your-old-auth-token',
      },
      target: {
        url: 'libsql://your-new-database.turso.io',
        authToken: 'your-new-auth-token',
      },
      options: {
        dryRun: true,
        resetPasswords: false,
        defaultPassword: 'ChangeMe123!',
      },
    };
    fs.writeFileSync(configPath, JSON.stringify(sampleConfig, null, 2));
    console.log(`\nSample config created at: ${configPath}`);
    console.log('Please edit the config file with your database credentials and run again.\n');
    console.log('Alternatively, set these environment variables:');
    console.log('  SOURCE_DB_URL, SOURCE_DB_AUTH_TOKEN');
    console.log('  TARGET_DB_URL, TARGET_DB_AUTH_TOKEN');
    console.log('  DRY_RUN=true|false, RESET_PASSWORDS=true|false');
    process.exit(0);
  }

  const configContent = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(configContent);
}

async function main() {
  console.log('👤 Vonix Network User Migration Tool\n');
  console.log('='.repeat(50));

  const config = await loadConfig();

  if (config.options.dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made\n');
  }

  // Connect to databases
  console.log('📡 Connecting to databases...');
  
  const sourceClient = createClient({
    url: config.source.url,
    authToken: config.source.authToken,
  });

  const targetClient = createClient({
    url: config.target.url,
    authToken: config.target.authToken,
  });

  // Test connections
  try {
    await sourceClient.execute('SELECT 1');
    console.log('   ✅ Source database connected');
  } catch (error: any) {
    console.error(`   ❌ Source connection failed: ${error.message}`);
    process.exit(1);
  }

  try {
    await targetClient.execute('SELECT 1');
    console.log('   ✅ Target database connected');
  } catch (error: any) {
    console.error(`   ❌ Target connection failed: ${error.message}`);
    process.exit(1);
  }

  // Fetch users from source
  console.log('\n📥 Fetching users from source database...');
  
  const sourceUsers = await sourceClient.execute(`
    SELECT 
      id, username, email, password, role,
      minecraft_username, minecraft_uuid,
      avatar, bio, xp, level, title,
      donation_rank_id, total_donated, created_at
    FROM users
  `);

  console.log(`   Found ${sourceUsers.rows.length} users`);

  if (sourceUsers.rows.length === 0) {
    console.log('\n✨ No users to migrate!');
    return;
  }

  // Migrate users
  console.log('\n📤 Migrating users...\n');
  
  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of sourceUsers.rows) {
    const user = row as unknown as OldUser;
    
    try {
      // Check if user already exists in target
      const existing = await targetClient.execute({
        sql: 'SELECT id FROM users WHERE username = ?',
        args: [user.username],
      });

      if (existing.rows.length > 0) {
        console.log(`   ⏭️  Skipping ${user.username} (already exists)`);
        skipped++;
        continue;
      }

      // Prepare password
      let password = user.password;
      if (config.options.resetPasswords && config.options.defaultPassword) {
        password = await bcrypt.hash(config.options.defaultPassword, 10);
      }

      if (config.options.dryRun) {
        console.log(`   [DRY RUN] Would migrate: ${user.username} (${user.role})`);
        migrated++;
        continue;
      }

      // Insert user into target
      await targetClient.execute({
        sql: `
          INSERT INTO users (
            username, email, password, role,
            minecraft_username, minecraft_uuid,
            avatar, bio, xp, level, title,
            donation_rank_id, total_donated,
            email_verified, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          user.username,
          user.email,
          password,
          user.role || 'user',
          user.minecraft_username,
          user.minecraft_uuid,
          user.avatar,
          user.bio,
          user.xp || 0,
          user.level || 1,
          user.title,
          user.donation_rank_id,
          user.total_donated || 0,
          true, // email_verified
          user.created_at || Math.floor(Date.now() / 1000),
          Math.floor(Date.now() / 1000),
        ],
      });

      console.log(`   ✅ Migrated: ${user.username} (${user.role})`);
      migrated++;
    } catch (error: any) {
      console.error(`   ❌ Error migrating ${user.username}: ${error.message}`);
      errors++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Migration Summary');
  console.log('='.repeat(50));
  console.log(`   ✅ Migrated: ${migrated}`);
  console.log(`   ⏭️  Skipped:  ${skipped}`);
  console.log(`   ❌ Errors:   ${errors}`);

  if (config.options.dryRun) {
    console.log('\n⚠️  This was a DRY RUN. Set "dryRun": false to apply changes.');
  }

  if (config.options.resetPasswords) {
    console.log(`\n🔑 Passwords were reset to: ${config.options.defaultPassword}`);
    console.log('   Users will need to change their passwords on first login.');
  }

  console.log('\n✨ User migration complete!');
}

main().catch(console.error);
