#!/bin/bash
# List all tables in the 'vonix' database
# Run as: sudo -u postgres bash list_tables.sh

DB="vonix"

echo "=== List of tables in $DB database ==="
psql -d $DB -c "\dt"

echo ""
echo "=== Structure of servers table ==="
psql -d $DB -c "\d servers"

echo ""
echo "=== Structure of api_keys table ==="
psql -d $DB -c "\d api_keys"
