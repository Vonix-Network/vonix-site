// verify-donations.mjs - Verify donation dates in PostgreSQL
// Run with: node verify-donations.mjs

import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function main() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('ERROR: DATABASE_URL not set in environment');
        process.exit(1);
    }

    const client = new Client({ connectionString });

    try {
        await client.connect();
        console.log('=== Vonix Donation System Verification ===\n');

        // 1. Check column types
        console.log('1. Donations table column types:');
        const typesResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'donations'
      AND column_name IN ('id', 'user_id', 'amount', 'created_at', 'payment_id', 'rank_id')
      ORDER BY ordinal_position
    `);
        console.table(typesResult.rows);

        // 2. Sample recent donations
        console.log('\n2. Sample of recent donations (last 10):');
        const sampleResult = await client.query(`
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
        console.table(sampleResult.rows);

        // 3. Count by date validity
        console.log('\n3. Donations by date validity:');
        const countResult = await client.query(`
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
        console.table(countResult.rows);

        // 4. Total donations
        console.log('\n4. Total completed donations:');
        const totalResult = await client.query(`
      SELECT 
        COUNT(*) as total_donations,
        COALESCE(SUM(amount), 0) as total_amount
      FROM donations
      WHERE status = 'completed'
    `);
        console.table(totalResult.rows);

        // Check if there are any invalid dates
        const invalidCount = countResult.rows.find(r => r.status !== 'Valid dates')?.count || 0;

        console.log('\n=== Verification Complete ===\n');

        if (invalidCount > 0) {
            console.log('⚠️  Found donations with invalid dates!');
            console.log('Run this SQL to fix: ALTER TABLE donations ALTER COLUMN created_at TYPE timestamp USING to_timestamp(created_at);');
        } else if (sampleResult.rows.length === 0) {
            console.log('ℹ️  No donations found in database yet.');
        } else {
            console.log('✅ All donation dates appear valid!');
        }

    } catch (error) {
        console.error('Database error:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

main();
