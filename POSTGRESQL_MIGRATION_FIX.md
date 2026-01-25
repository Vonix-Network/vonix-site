# PostgreSQL Migration Fix Guide for Vonix-Site

## Problem Summary
The PostgreSQL migration is failing because:
1. The existing migration files are SQLite-specific (using `integer` for timestamps with `unixepoch()`)
2. When switching to PostgreSQL, the tables need to be created with proper PostgreSQL types
3. The data type conversion script needs to handle mixed formats from SQLite migration

## Immediate Fix Steps

### Step 1: Check Current Database State
```bash
# Connect to PostgreSQL
psql $DATABASE_URL

# Check what tables exist
\dt

# Check current data types
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('users', 'registration_codes', 'api_keys')
ORDER BY table_name, column_name;
```

### Step 2: Create Essential Tables (if they don't exist)
```bash
# Run the registration tables fix script
psql $DATABASE_URL -f scripts/fix-postgres-registration-tables.sql
```

### Step 3: Fix Data Types for Critical Tables
The registration flow depends on these tables having correct timestamp types:

1. **registration_codes** - Used by Minecraft `/register` command
2. **api_keys** - Used for API authentication 
3. **users** - Main user accounts

### Step 4: Test the Registration Flow
```bash
# Test API key authentication (should work after table fix)
curl -H "x-api-key: vnx_test_key_123" http://localhost:3000/api/minecraft/register?uuid=test-uuid

# Test registration code generation (Minecraft mod simulation)
curl -X POST http://localhost:3000/api/minecraft/register \
  -H "Content-Type: application/json" \
  -H "x-api-key: vnx_test_key_123" \
  -d '{"minecraft_username": "testuser", "minecraft_uuid": "12345678-1234-1234-1234-123456789012"}'
```

## Long-term Solution

### Generate PostgreSQL Migrations
```bash
# Generate PostgreSQL-specific migrations
npm run db:generate

# This should create drizzle-postgres/ directory with proper PostgreSQL SQL files
ls -la drizzle-postgres/
```

### Apply PostgreSQL Migrations
```bash
# Push the PostgreSQL schema
npm run db:push
```

### Complete Data Migration
After the schema is correct, run the comprehensive type fix:
```bash
psql $DATABASE_URL -f scripts/fix-postgres-types-v2.sql
```

## Verification Checklist

- [ ] `registration_codes.expires_at` is `timestamp` type
- [ ] `api_keys.created_at` is `timestamp` type  
- [ ] `users.created_at` is `timestamp` type
- [ ] API key authentication works: `GET /api/minecraft/verify?uuid=<uuid>`
- [ ] Registration code generation works: `POST /api/minecraft/register`
- [ ] Website registration works: `POST /api/auth/register`

## Common Issues and Fixes

### Issue: "relation does not exist"
**Solution**: Tables haven't been created yet. Run the registration tables script first.

### Issue: "operator does not exist: bigint ~ unknown"
**Solution**: The regex operator `~` doesn't work with bigint. Use the enhanced type conversion functions in `fix-postgres-types-v2.sql`.

### Issue: API key validation fails
**Solution**: Check that `api_keys` table exists and has correct data types. Insert a test key if needed.

### Issue: Registration codes expire immediately
**Solution**: Check that `registration_codes.expires_at` is properly converted from integer timestamps to PostgreSQL timestamps.

## Quick Diagnostic Commands

```bash
# Check if tables exist
psql $DATABASE_URL -c "SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public';"

# Check data types
psql $DATABASE_URL -c "\d registration_codes"
psql $DATABASE_URL -c "\d api_keys"

# Check for any data
psql $DATABASE_URL -c "SELECT COUNT(*) FROM registration_codes;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM api_keys;"

# Test timestamp conversion
psql $DATABASE_URL -c "SELECT CURRENT_TIMESTAMP + INTERVAL '15 minutes';"
```

## Next Steps After Fix

1. **Test the complete registration flow**:
   - Minecraft player runs `/register` in-game
   - Gets registration code
   - Uses code on website registration form
   - Account is created and linked

2. **Test API authentication**:
   - Minecraft server uses API key to authenticate
   - Can verify player accounts
   - Can update player data

3. **Monitor for errors**:
   - Check application logs for database errors
   - Monitor registration success rates
   - Verify API key usage