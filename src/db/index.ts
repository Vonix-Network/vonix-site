/**
 * Unified Database Connection
 * 
 * Supports multiple database backends:
 * - SQLite (local file) - Default
 * - Turso (SQLite in the cloud)
 * - PostgreSQL (including Supabase)
 * - MySQL
 * - MariaDB
 * 
 * The database type is determined by the DATABASE_TYPE environment variable:
 * - 'sqlite' or 'turso' (default) - Uses libsql/SQLite
 * - 'postgres' or 'supabase' - Uses PostgreSQL
 * - 'mysql' or 'mariadb' - Uses MySQL/MariaDB
 * 
 * NOTE: For PostgreSQL/MySQL support, install the respective drivers:
 * - PostgreSQL: npm install postgres
 * - MySQL: npm install mysql2
 */

import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema-sqlite';

// Get database type from environment
const DATABASE_TYPE = (process.env.DATABASE_TYPE || 'sqlite').toLowerCase();

// Determine which database driver to use
export function getDatabaseType(): 'sqlite' | 'postgres' | 'mysql' {
  switch (DATABASE_TYPE) {
    case 'sqlite':
    case 'turso':
    case 'libsql':
      return 'sqlite';
    case 'postgres':
    case 'postgresql':
    case 'supabase':
      return 'postgres';
    case 'mysql':
    case 'mariadb':
      return 'mysql';
    default:
      return 'sqlite';
  }
}

// Create database client for SQLite/Turso (the default)
const client = createClient({
  url: process.env.DATABASE_URL || 'file:./data/vonix.db',
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

// Create drizzle instance with schema
export const db = drizzle(client, { schema });

// Export schema for use in queries
export * from './schema';

// Export database type for conditional logic
export const databaseType = getDatabaseType();

/**
 * Initialize PostgreSQL connection
 * Call this at app startup if using PostgreSQL/Supabase
 * 
 * @returns PostgreSQL drizzle instance
 * @example
 * ```ts
 * import { initPostgres } from '@/db';
 * const pgDb = await initPostgres();
 * ```
 */
export async function initPostgres() {
  const { drizzle: drizzlePg } = await import('drizzle-orm/postgres-js');
  const postgresModule = await import('postgres');
  const postgres = postgresModule.default;
  const pgSchema = await import('./schema-postgres');

  const connectionUrl = process.env.DATABASE_URL!;
  const isSupabase = connectionUrl.includes('supabase');

  const pgClient = postgres(connectionUrl, {
    prepare: !isSupabase, // Supabase doesn't support prepared statements in serverless
    ssl: isSupabase || process.env.DATABASE_SSL === 'true' ? 'require' : undefined,
  });

  return drizzlePg(pgClient, { schema: pgSchema });
}

/**
 * Initialize MySQL/MariaDB connection
 * Call this at app startup if using MySQL/MariaDB
 * 
 * @returns MySQL drizzle instance
 * @example
 * ```ts
 * import { initMySQL } from '@/db';
 * const mysqlDb = await initMySQL();
 * ```
 */
export async function initMySQL() {
  const { drizzle: drizzleMysql } = await import('drizzle-orm/mysql2');
  const mysql2 = await import('mysql2/promise');
  const mysqlSchema = await import('./schema-mysql');

  const pool = mysql2.createPool({
    uri: process.env.DATABASE_URL!,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  return drizzleMysql(pool, { schema: mysqlSchema, mode: 'default' });
}

/**
 * Get the appropriate database instance based on DATABASE_TYPE
 * Use this for dynamic database selection at runtime
 * 
 * @returns Database instance (type depends on DATABASE_TYPE)
 * @example
 * ```ts
 * import { getDatabase } from '@/db';
 * const database = await getDatabase();
 * ```
 */
export async function getDatabase() {
  const dbType = getDatabaseType();

  switch (dbType) {
    case 'postgres':
      return initPostgres();
    case 'mysql':
      return initMySQL();
    default:
      return db;
  }
}
