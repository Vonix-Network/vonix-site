import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

// Create database client
const client = createClient({
  url: process.env.DATABASE_URL || 'file:./data/vonix.db',
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

// Create drizzle instance with schema
export const db = drizzle(client, { schema });

// Export schema for use in queries
export * from './schema';
