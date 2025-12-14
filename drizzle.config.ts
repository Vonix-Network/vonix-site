import type { Config } from 'drizzle-kit';
import { config } from 'dotenv';

// Load .env.local
config({ path: '.env.local' });

// Detect if using Turso (libsql:// or https://) or local SQLite (file:)
const dbUrl = process.env.DATABASE_URL || 'file:./data/vonix.db';
const isTurso = dbUrl.startsWith('libsql://') || dbUrl.startsWith('https://');

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: isTurso ? 'turso' : 'sqlite',
  dbCredentials: isTurso
    ? {
        url: dbUrl,
        authToken: process.env.DATABASE_AUTH_TOKEN,
      }
    : {
        url: dbUrl,
      },
} satisfies Config;
