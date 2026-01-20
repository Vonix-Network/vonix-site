#!/bin/bash
# Donation System Verification Script
# Checks donations table structure and data integrity after PostgreSQL migration

echo "=== Vonix Donation System Verification ==="
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
fi

if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL not found in environment"
    echo "Make sure you have a .env file with DATABASE_URL set"
    exit 1
fi

echo "1. Checking donations table column types..."
psql "$DATABASE_URL" -c "
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'donations'
AND column_name IN ('id', 'user_id', 'amount', 'created_at', 'payment_id', 'rank_id')
ORDER BY ordinal_position;
"

echo ""
echo "2. Sample of recent donations (last 10)..."
psql "$DATABASE_URL" -c "
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
LIMIT 10;
"

echo ""
echo "3. Count of donations by date validity..."
psql "$DATABASE_URL" -c "
SELECT 
    CASE 
        WHEN created_at IS NULL THEN 'NULL dates'
        WHEN EXTRACT(YEAR FROM created_at) < 2000 THEN 'Invalid (pre-2000)'
        WHEN EXTRACT(YEAR FROM created_at) > 2100 THEN 'Invalid (future)'
        ELSE 'Valid dates'
    END as status,
    COUNT(*) as count
FROM donations
GROUP BY 1;
"

echo ""
echo "4. Total donation count and sum..."
psql "$DATABASE_URL" -c "
SELECT 
    COUNT(*) as total_donations,
    COALESCE(SUM(amount), 0) as total_amount
FROM donations
WHERE status = 'completed';
"

echo ""
echo "=== Verification Complete ==="
echo ""
echo "If you see 'Invalid' or 'NULL' dates, run the following SQL fix:"
echo "ALTER TABLE donations ALTER COLUMN created_at TYPE timestamp USING to_timestamp(created_at);"
