// verify-donations.ts - Verify donation dates using project's drizzle setup
// Run with: npx tsx verify-donations.ts

import dotenv from 'dotenv';
import path from 'path';

// Load from parent directory where .env is located
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('ERROR: DATABASE_URL not set in environment');
    process.exit(1);
  }

  const client = postgres(connectionString);
  const db = drizzle(client);

  try {
    console.log('=== Vonix Donation System Verification ===\n');

    // 1. Check column types
    console.log('1. Donations table column types:');
    const typesResult = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'donations'
      AND column_name IN ('id', 'user_id', 'amount', 'created_at', 'payment_id', 'rank_id')
      ORDER BY ordinal_position
    `);
    console.table(typesResult);

    // 2. Sample recent donations
    console.log('\n2. Sample of recent donations (last 10):');
    const sampleResult = await db.execute(sql`
      SELECT 
        id,
        user_id,
        amount,
        method,
        payment_type,
        created_at,
        CASE WHEN created_at IS NULL THEN 'NULL'
             WHEN EXTRACT(YEAR FROM created_at) < 2000 THEN 'INVALID (pre-2000)'
             ELSE 'OK'
        END as date_status
      FROM donations
      ORDER BY id DESC
      LIMIT 10
    `);
    console.table(sampleResult);

    // 3. Count by date validity
    console.log('\n3. Donations by date validity:');
    const countResult = await db.execute(sql`
      SELECT 
        CASE 
          WHEN created_at IS NULL THEN 'NULL dates'
          WHEN EXTRACT(YEAR FROM created_at) < 2000 THEN 'Invalid (pre-2000)'
          WHEN EXTRACT(YEAR FROM created_at) > 2100 THEN 'Invalid (future)'
          ELSE 'Valid dates'
        END as status,
        COUNT(*) as count
      FROM donations
      GROUP BY 1
    `);
    console.table(countResult);

    // 4. Total donations
    console.log('\n4. Total completed donations:');
    const totalResult = await db.execute(sql`
      SELECT 
        COUNT(*) as total_donations,
        COALESCE(SUM(amount), 0) as total_amount
      FROM donations
      WHERE status = 'completed'
    `);
    console.table(totalResult);

    // Check if there are any invalid dates
    const invalidRow = (countResult as any[]).find((r: any) => r.status !== 'Valid dates');
    const invalidCount = invalidRow?.count || 0;

    console.log('\n=== Verification Complete ===\n');

    if (Number(invalidCount) > 0) {
      console.log('⚠️  WARNING: Found donations with invalid dates!');
      console.log('Run this SQL to fix: ALTER TABLE donations ALTER COLUMN created_at TYPE timestamp USING to_timestamp(created_at);');
    } else if ((sampleResult as any[]).length === 0) {
      console.log('ℹ️  INFO: No donations found in database yet.');
    } else {
      console.log('✅ SUCCESS: All donation dates appear valid!');
    }

  } catch (error: any) {
    console.error('Database error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
