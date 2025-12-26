import type { Config } from 'drizzle-kit';
import { config } from 'dotenv';

// Load .env.local
config({ path: '.env.local' });

// Get database type from environment
const DATABASE_TYPE = (process.env.DATABASE_TYPE || 'sqlite').toLowerCase();
const DATABASE_URL = process.env.DATABASE_URL || 'file:./data/vonix.db';

// Determine dialect and configuration based on DATABASE_TYPE
function getConfig(): Config {
  switch (DATABASE_TYPE) {
    case 'sqlite':
    case 'turso':
    case 'libsql': {
      const isTurso = DATABASE_URL.startsWith('libsql://') || DATABASE_URL.startsWith('https://');
      return {
        schema: './src/db/schema-sqlite.ts',
        out: './drizzle',
        dialect: isTurso ? 'turso' : 'sqlite',
        dbCredentials: isTurso
          ? {
            url: DATABASE_URL,
            authToken: process.env.DATABASE_AUTH_TOKEN,
          }
          : {
            url: DATABASE_URL,
          },
      };
    }

    case 'postgres':
    case 'postgresql':
    case 'supabase': {
      if (!DATABASE_URL) {
        throw new Error('DATABASE_URL is required for PostgreSQL/Supabase');
      }
      return {
        schema: './src/db/schema-postgres.ts',
        out: './drizzle-postgres',
        dialect: 'postgresql',
        dbCredentials: {
          url: DATABASE_URL,
        },
      };
    }

    case 'mysql':
    case 'mariadb': {
      if (!DATABASE_URL) {
        throw new Error('DATABASE_URL is required for MySQL/MariaDB');
      }
      return {
        schema: './src/db/schema-mysql.ts',
        out: './drizzle-mysql',
        dialect: 'mysql',
        dbCredentials: {
          url: DATABASE_URL,
        },
      };
    }

    default: {
      console.warn(`Unknown DATABASE_TYPE: ${DATABASE_TYPE}, defaulting to sqlite`);
      return {
        schema: './src/db/schema-sqlite.ts',
        out: './drizzle',
        dialect: 'sqlite',
        dbCredentials: {
          url: DATABASE_URL,
        },
      };
    }
  }
}

export default getConfig() satisfies Config;
