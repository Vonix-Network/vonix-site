/**
 * Database Migration Script
 * 
 * Migrates data from an old Turso database to the new one.
 * 
 * Usage:
 *   1. Create a config file: scripts/migration-config.json
 *   2. Run: npx tsx scripts/migrate-from-turso.ts
 * 
 * Config file format:
 * {
 *   "source": {
 *     "url": "libsql://your-old-db.turso.io",
 *     "authToken": "your-old-auth-token"
 *   },
 *   "target": {
 *     "url": "libsql://your-new-db.turso.io",
 *     "authToken": "your-new-auth-token"
 *   },
 *   "tables": ["users", "donations", "donationRanks", "servers", "events"],
 *   "options": {
 *     "skipExisting": true,
 *     "dryRun": false
 *   }
 * }
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
  tables: string[];
  options: {
    skipExisting: boolean;
    dryRun: boolean;
  };
}

// Tables to migrate in order (respecting foreign key dependencies)
const TABLE_ORDER = [
  'donation_ranks',
  'users',
  'servers',
  'events',
  'event_attendees',
  'donations',
  'forum_categories',
  'forum_posts',
  'forum_replies',
  'achievements',
  'user_achievements',
  'notifications',
  'api_keys',
  'site_settings',
];

// Column mappings for schema differences (old -> new)
const COLUMN_MAPPINGS: Record<string, Record<string, string>> = {
  users: {
    // Add any column name changes here
    // 'old_column_name': 'new_column_name'
  },
};

async function loadConfig(): Promise<MigrationConfig> {
  const configPath = path.join(__dirname, 'migration-config.json');
  
  if (!fs.existsSync(configPath)) {
    console.log('Creating sample config file...');
    const sampleConfig: MigrationConfig = {
      source: {
        url: 'libsql://your-old-database.turso.io',
        authToken: 'your-old-auth-token',
      },
      target: {
        url: 'libsql://your-new-database.turso.io',
        authToken: 'your-new-auth-token',
      },
      tables: ['users', 'donations', 'donation_ranks', 'servers'],
      options: {
        skipExisting: true,
        dryRun: true,
      },
    };
    fs.writeFileSync(configPath, JSON.stringify(sampleConfig, null, 2));
    console.log(`Sample config created at: ${configPath}`);
    console.log('Please edit the config file and run again.');
    process.exit(0);
  }

  const configContent = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(configContent);
}

async function getTableColumns(client: any, tableName: string): Promise<string[]> {
  const result = await client.execute(`PRAGMA table_info(${tableName})`);
  return result.rows.map((row: any) => row.name);
}

async function migrateTable(
  sourceClient: any,
  targetClient: any,
  tableName: string,
  options: MigrationConfig['options']
): Promise<{ migrated: number; skipped: number; errors: number }> {
  console.log(`\n📦 Migrating table: ${tableName}`);
  
  const stats = { migrated: 0, skipped: 0, errors: 0 };

  try {
    // Get source data
    const sourceData = await sourceClient.execute(`SELECT * FROM ${tableName}`);
    console.log(`   Found ${sourceData.rows.length} rows in source`);

    if (sourceData.rows.length === 0) {
      console.log('   No data to migrate');
      return stats;
    }

    // Get target columns
    const targetColumns = await getTableColumns(targetClient, tableName);
    const sourceColumns = Object.keys(sourceData.rows[0]);
    
    // Apply column mappings
    const mappings = COLUMN_MAPPINGS[tableName] || {};
    
    // Filter to only columns that exist in target
    const validColumns = sourceColumns.filter(col => {
      const mappedCol = mappings[col] || col;
      return targetColumns.includes(mappedCol);
    });

    console.log(`   Columns to migrate: ${validColumns.join(', ')}`);

    for (const row of sourceData.rows) {
      try {
        // Check if record exists (by id or primary key)
        if (options.skipExisting && row.id) {
          const existing = await targetClient.execute({
            sql: `SELECT id FROM ${tableName} WHERE id = ?`,
            args: [row.id],
          });
          
          if (existing.rows.length > 0) {
            stats.skipped++;
            continue;
          }
        }

        // Build insert statement
        const mappedColumns = validColumns.map(col => mappings[col] || col);
        const values = validColumns.map(col => row[col]);
        const placeholders = values.map(() => '?').join(', ');

        const insertSql = `INSERT INTO ${tableName} (${mappedColumns.join(', ')}) VALUES (${placeholders})`;

        if (options.dryRun) {
          console.log(`   [DRY RUN] Would insert: ${JSON.stringify(row).substring(0, 100)}...`);
          stats.migrated++;
        } else {
          await targetClient.execute({
            sql: insertSql,
            args: values,
          });
          stats.migrated++;
        }
      } catch (error: any) {
        console.error(`   Error migrating row: ${error.message}`);
        stats.errors++;
      }
    }

    console.log(`   ✅ Migrated: ${stats.migrated}, Skipped: ${stats.skipped}, Errors: ${stats.errors}`);
  } catch (error: any) {
    console.error(`   ❌ Failed to migrate table: ${error.message}`);
    stats.errors++;
  }

  return stats;
}

async function main() {
  console.log('🚀 Vonix Network Database Migration Tool\n');
  console.log('='.repeat(50));

  const config = await loadConfig();

  if (config.options.dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made\n');
  }

  // Connect to source database
  console.log('📡 Connecting to source database...');
  const sourceClient = createClient({
    url: config.source.url,
    authToken: config.source.authToken,
  });

  // Connect to target database
  console.log('📡 Connecting to target database...');
  const targetClient = createClient({
    url: config.target.url,
    authToken: config.target.authToken,
  });

  // Test connections
  try {
    await sourceClient.execute('SELECT 1');
    console.log('   ✅ Source connection successful');
  } catch (error) {
    console.error('   ❌ Failed to connect to source database');
    process.exit(1);
  }

  try {
    await targetClient.execute('SELECT 1');
    console.log('   ✅ Target connection successful');
  } catch (error) {
    console.error('   ❌ Failed to connect to target database');
    process.exit(1);
  }

  // Determine tables to migrate
  const tablesToMigrate = config.tables.length > 0
    ? TABLE_ORDER.filter(t => config.tables.includes(t))
    : TABLE_ORDER;

  console.log(`\n📋 Tables to migrate: ${tablesToMigrate.join(', ')}`);

  // Migrate each table
  const totalStats = { migrated: 0, skipped: 0, errors: 0 };

  for (const table of tablesToMigrate) {
    const stats = await migrateTable(sourceClient, targetClient, table, config.options);
    totalStats.migrated += stats.migrated;
    totalStats.skipped += stats.skipped;
    totalStats.errors += stats.errors;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Migration Summary');
  console.log('='.repeat(50));
  console.log(`   Total Migrated: ${totalStats.migrated}`);
  console.log(`   Total Skipped:  ${totalStats.skipped}`);
  console.log(`   Total Errors:   ${totalStats.errors}`);

  if (config.options.dryRun) {
    console.log('\n⚠️  This was a DRY RUN. Set "dryRun": false in config to apply changes.');
  }

  console.log('\n✨ Migration complete!');
}

main().catch(console.error);
