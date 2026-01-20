#!/bin/bash
# XP-Key Verification Script
# Checks that each server has a valid XP Sync API key
# Run as: sudo bash verify-xp-keys.sh (or as root)

DB="vonix"

echo "=== XP-Key Verification ==="
echo ""

echo "[1] All registered servers:"
su postgres -c "psql -d $DB -c \"SELECT id, name, ip_address FROM servers ORDER BY id;\""

echo ""
echo "[2] All API keys in the database:"
su postgres -c "psql -d $DB -c \"SELECT id, name, LEFT(key, 20) || '...' as key_preview, created_at FROM api_keys ORDER BY id;\""

echo ""
echo "[3] Servers with their XP Sync keys (server_{id}_key naming convention):"
su postgres -c "psql -d $DB -c \"
SELECT 
    s.id as server_id, 
    s.name as server_name, 
    CASE WHEN ak.id IS NOT NULL THEN 'YES' ELSE 'NO' END as has_xp_key,
    ak.name as key_name,
    CASE WHEN ak.key IS NOT NULL THEN LEFT(ak.key, 15) || '...' ELSE NULL END as key_preview
FROM servers s
LEFT JOIN api_keys ak ON ak.name = 'server_' || s.id || '_key'
ORDER BY s.id;
\""

echo ""
echo "[4] Servers MISSING XP keys:"
su postgres -c "psql -d $DB -c \"
SELECT 
    s.id as server_id, 
    s.name as server_name,
    'server_' || s.id || '_key' as expected_key_name
FROM servers s
LEFT JOIN api_keys ak ON ak.name = 'server_' || s.id || '_key'
WHERE ak.id IS NULL
ORDER BY s.id;
\""

echo ""
echo "=== How to fix missing keys ==="
echo "For each server missing an XP key, go to:"
echo "  /admin/servers -> Click the server -> Generate API Key"
echo ""
echo "Or run this SQL to generate keys for all servers:"
echo "  INSERT INTO api_keys (name, key, created_at, updated_at)"
echo "  SELECT 'server_' || id || '_key', 'vxn_' || md5(random()::text || clock_timestamp()::text), NOW(), NOW()"
echo "  FROM servers s"
echo "  WHERE NOT EXISTS (SELECT 1 FROM api_keys WHERE name = 'server_' || s.id || '_key');"
echo ""
echo "=== Verification Complete ==="
