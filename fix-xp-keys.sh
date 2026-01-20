#!/bin/bash
# Fix XP-Key Issues Script
# Fixes NULL timestamps and creates missing keys
# Run as: bash fix-xp-keys.sh

DB="vonix"

echo "=== XP-Key Fix Script ==="
echo ""

echo "[1] Fixing NULL timestamps in api_keys table..."
su postgres -c "psql -d $DB -c \"
UPDATE api_keys 
SET created_at = NOW(), updated_at = NOW() 
WHERE created_at IS NULL OR updated_at IS NULL;
\""

echo ""
echo "[2] Generating missing XP keys for servers..."
su postgres -c "psql -d $DB -c \"
INSERT INTO api_keys (name, key, created_at, updated_at)
SELECT 
    'server_' || s.id || '_key', 
    'vxn_' || md5(random()::text || clock_timestamp()::text), 
    NOW(), 
    NOW()
FROM servers s
WHERE NOT EXISTS (
    SELECT 1 FROM api_keys WHERE name = 'server_' || s.id || '_key'
);
\""

echo ""
echo "[3] Verifying all servers now have keys..."
su postgres -c "psql -d $DB -c \"
SELECT 
    s.id as server_id, 
    s.name as server_name, 
    CASE WHEN ak.id IS NOT NULL THEN 'OK' ELSE 'MISSING' END as status,
    ak.name as key_name
FROM servers s
LEFT JOIN api_keys ak ON ak.name = 'server_' || s.id || '_key'
ORDER BY s.id;
\""

echo ""
echo "=== Fix Complete ==="
echo "Restart your Next.js app to apply changes: pm2 restart vonix-network"
