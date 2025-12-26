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
import * as schemaSqlite from './schema-sqlite';

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

// Export database type for conditional logic
export const databaseType = getDatabaseType();

/**
 * Global database instance (internal)
 */
let _db: any = null;

/**
 * Synchronous database instance export
 * 
 * Uses a Proxy to lazily initialize the correct database driver on first access.
 * This avoids errors caused by initializing the wrong driver at module load time
 * (e.g. libsql trying to parse a postgresql:// URL).
 */
export const db = new Proxy({} as any, {
  get(target, prop, receiver) {
    if (!_db) {
      const type = getDatabaseType();
      const url = process.env.DATABASE_URL || '';

      if (type === 'postgres') {
        try {
          // Dynamic require for PostgreSQL support
          const postgres = require('postgres');
          const { drizzle: drizzlePg } = require('drizzle-orm/postgres-js');
          const pgSchema = require('./schema-postgres');

          const isSupabase = url.includes('supabase');
          const pgClient = postgres(url, {
            prepare: !isSupabase,
            ssl: isSupabase || process.env.DATABASE_SSL === 'true' ? 'require' : undefined,
          });

          _db = drizzlePg(pgClient, { schema: pgSchema });
        } catch (error: any) {
          console.error('Failed to initialize PostgreSQL client. Ensure "postgres" package is installed.', error);
          throw error;
        }
      } else if (type === 'mysql') {
        try {
          // Dynamic require for MySQL support
          const mysql = require('mysql2/promise');
          const { drizzle: drizzleMysql } = require('drizzle-orm/mysql2');
          const mysqlSchema = require('./schema-mysql');

          const pool = mysql.createPool({
            uri: url,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
          });

          _db = drizzleMysql(pool, { schema: mysqlSchema, mode: 'default' });
        } catch (error: any) {
          console.error('Failed to initialize MySQL client. Ensure "mysql2" package is installed.', error);
          throw error;
        }
      } else {
        // Default to SQLite/Turso
        const sqliteUrl = url.startsWith('postgresql') || url.startsWith('mysql')
          ? 'file:./data/vonix.db'
          : (url || 'file:./data/vonix.db');

        const client = createClient({
          url: sqliteUrl,
          authToken: process.env.DATABASE_AUTH_TOKEN,
        });

        _db = drizzle(client, { schema: schemaSqlite });
      }
    }

    // Forward the property access to the real drizzle instance
    const value = _db[prop];
    return typeof value === 'function' ? value.bind(_db) : value;
  }
});

/**
 * Re-export all schema definitions
 * Note: These are from the SQLite schema for backward compatibility with types.
 */
export * from './schema';

/**
 * Initialize PostgreSQL connection (Asynchronous helper)
 */
export async function initPostgres() {
  const { drizzle: drizzlePg } = await import('drizzle-orm/postgres-js');
  const postgresModule = await import('postgres');
  const postgres = postgresModule.default;
  const pgSchema = await import('./schema-postgres');

  const connectionUrl = process.env.DATABASE_URL!;
  const isSupabase = connectionUrl.includes('supabase');

  const pgClient = postgres(connectionUrl, {
    prepare: !isSupabase,
    ssl: isSupabase || process.env.DATABASE_SSL === 'true' ? 'require' : undefined,
  });

  return drizzlePg(pgClient, { schema: pgSchema });
}

/**
 * Initialize MySQL/MariaDB connection (Asynchronous helper)
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
 * Get the appropriate database instance (Asynchronous helper)
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
