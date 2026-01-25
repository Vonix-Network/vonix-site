#!/bin/bash
# PostgreSQL Migration Fix Script v2
# This script automates the database migration process by generating, applying, and fixing schema definitions.

echo "=== PostgreSQL Migration Fix for Vonix-Site (v2) ==="
echo "Current directory: $(pwd)"

# Ensure DATABASE_URL is set from .env.local
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is not set. Ensure it is defined in .env.local."
    exit 1
fi

# Step 1: Generate PostgreSQL migration file
echo "Step 1: Generating PostgreSQL migration file..."
npm run db:generate

# Find the latest (and only) migration file
MIGRATION_FILE=$(ls -t drizzle-postgres/*.sql | head -n 1)

if [ -z "$MIGRATION_FILE" ]; then
    echo "❌ No SQL migration file found in drizzle-postgres/. Migration generation may have failed."
    exit 1
fi
echo "✅ Migration file found: $MIGRATION_FILE"

# Step 2: Apply the manual DDL fix to pre-create problematic tables
echo "Step 2: Applying manual DDL for core tables to prevent 'serial' type error..."
if [ -f "scripts/fix-postgres-registration-tables.sql" ]; then
    psql "$DATABASE_URL" -f scripts/fix-postgres-registration-tables.sql
else
    echo "⚠️ Manual DDL fix script not found, continuing without it. This may fail."
fi

# Step 3: Apply the main generated migration file
echo "Step 3: Applying generated migration: $MIGRATION_FILE..."
psql "$DATABASE_URL" -f "$MIGRATION_FILE"

# Step 4: Apply the type conversion script to handle data inconsistencies
echo "Step 4: Applying data type conversion script..."
if [ -f "scripts/fix-postgres-types-v2.sql" ]; then
    psql "$DATABASE_URL" -f scripts/fix-postgres-types-v2.sql
else
    echo "⚠️ Type conversion script not found. Timestamps or other types may be incorrect."
fi

echo "=== Migration and Fixes Complete ==="

# Step 5: Verification
echo "Step 5: Verifying database schema..."
echo "--- Tables in database ---"
psql "$DATABASE_URL" -c "\dt"
echo "--- Columns in 'users' table ---"
psql "$DATABASE_URL" -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' LIMIT 10;"
echo "--- Timestamp columns verification ---"
psql "$DATABASE_URL" -c "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE column_name IN ('created_at', 'updated_at', 'expires_at', 'timestamp') AND data_type = 'timestamp without time zone';"

echo "✅ Verification complete. Check the output above for any errors."