-- PostgreSQL API Keys Diagnostic Script
-- Run this on your PostgreSQL database to diagnose XP-SYNC API key issues

-- ===================================================================
-- 1. CHECK IF api_keys TABLE EXISTS AND ITS STRUCTURE
-- ===================================================================

\d api_keys

-- ===================================================================
-- 2. LIST ALL EXISTING API KEYS
-- ===================================================================

SELECT id, name, key, created_at, updated_at 
FROM api_keys 
ORDER BY created_at DESC;

-- ===================================================================
-- 3. CHECK FOR SERVER-SPECIFIC KEYS (XP-SYNC pattern)
-- ===================================================================

SELECT * FROM api_keys WHERE name LIKE 'server_%_key';

-- ===================================================================
-- 4. CHECK ALL SERVERS AND THEIR IDS
-- ===================================================================

SELECT id, name, ip_address, port, game_type, created_at 
FROM servers 
ORDER BY id;

-- ===================================================================
-- 5. VERIFY THE KEY NAME PATTERN MATCHES
-- Check what keys SHOULD exist vs what DO exist
-- ===================================================================

SELECT 
    s.id as server_id,
    s.name as server_name,
    'server_' || s.id || '_key' as expected_key_name,
    ak.name as actual_key_name,
    CASE WHEN ak.id IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM servers s
LEFT JOIN api_keys ak ON ak.name = 'server_' || s.id || '_key'
ORDER BY s.id;

-- ===================================================================
-- 6. CHECK TABLE COLUMN TYPES (ensure they're not corrupted)
-- ===================================================================

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'api_keys'
ORDER BY ordinal_position;

-- ===================================================================
-- 7. CHECK FOR DUPLICATE KEYS OR CONSTRAINT ISSUES
-- ===================================================================

SELECT name, COUNT(*) as count 
FROM api_keys 
GROUP BY name 
HAVING COUNT(*) > 1;

-- ===================================================================
-- 8. CHECK UNIQUE CONSTRAINT EXISTS ON NAME COLUMN
-- ===================================================================

SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'api_keys'::regclass;

-- If unique constraint is missing, add it:
-- ALTER TABLE api_keys ADD CONSTRAINT api_keys_name_unique UNIQUE (name);
