#!/bin/bash
# PostgreSQL Migration Fix Script
# Run this on the server to properly migrate from SQLite to PostgreSQL

echo "=== PostgreSQL Migration Fix for Vonix-Site ==="
echo "Current directory: $(pwd)"

# Step 1: Generate PostgreSQL migrations
echo "Step 1: Generating PostgreSQL migrations..."
npm run db:generate

# Check if drizzle-postgres directory was created
if [ -d "drizzle-postgres" ]; then
    echo "✅ PostgreSQL migrations generated successfully"
    ls -la drizzle-postgres/
else
    echo "❌ Failed to generate PostgreSQL migrations"
    exit 1
fi

# Step 2: Apply PostgreSQL migrations
echo "Step 2: Applying PostgreSQL migrations..."
npm run db:push

# Step 3: Check if tables were created
echo "Step 3: Verifying table creation..."
psql $DATABASE_URL -c "\dt" 2>/dev/null || echo "Could not connect to verify tables"

# Step 4: Fix data types
echo "Step 4: Fixing PostgreSQL data types..."
if [ -f "scripts/fix-postgres-types-v2.sql" ]; then
    psql $DATABASE_URL -f scripts/fix-postgres-types-v2.sql
else
    echo "❌ Type fix script not found"
fi

echo "=== Migration complete ==="

# Step 5: Verification
echo "Step 5: Verifying registration_codes table..."
psql $DATABASE_URL -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'registration_codes' AND column_name = 'expires_at';" 2>/dev/null || echo "Could not verify registration_codes table"

echo "Step 6: Verifying api_keys table..."
psql $DATABASE_URL -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'created_at';" 2>/dev/null || echo "Could not verify api_keys table"