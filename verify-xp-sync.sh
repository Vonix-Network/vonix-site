#!/bin/bash
# XP-Sync API Verification Script (Updated)
# Run as: sudo -u postgres bash verify-xp-sync.sh

DB="vonix"

echo "=== XP-Sync API Verification ==="
echo ""

echo "[1] Checking api_keys table structure:"
psql -d $DB -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'api_keys' ORDER BY ordinal_position;"

echo ""
echo "[2] List of all API keys in the database:"
psql -d $DB -c "SELECT id, name, key, created_at FROM api_keys ORDER BY id;"

echo ""
echo "[3] Checking servers and their associated key names:"
echo "Note: The website expects keys named 'server_{id}_key' in the api_keys table."
psql -d $DB -c "SELECT id, name, ip_address, 'server_' || id || '_key' as expected_key_name FROM servers ORDER BY id;"

echo ""
echo "[4] Verifying if expected server keys exist:"
psql -d $DB -c "
SELECT 
    s.id as server_id, 
    s.name as server_name, 
    ak.name as key_found,
    ak.key as key_value
FROM servers s
LEFT JOIN api_keys ak ON ak.name = 'server_' || s.id || '_key'
ORDER BY s.id;"

echo ""
echo "[5] Recent server activity (to check if sync is working):"
psql -d $DB -c "SELECT id, name, updated_at FROM servers ORDER BY updated_at DESC LIMIT 5;"

echo ""
echo "=== Verification Complete ==="
