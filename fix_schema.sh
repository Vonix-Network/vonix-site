#!/bin/bash
# PostgreSQL Schema Migration Script
# Adds missing columns and tables to the vonix database
# Run as: sudo -u postgres bash fix_schema.sh

DB="vonix"

echo "=== Vonix Database Schema Migration ==="
echo ""

# Helper function to add column if it doesn't exist
add_column_if_missing() {
    local table=$1
    local column=$2
    local definition=$3
    
    psql -d $DB -c "
        DO \$\$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = '$table' AND column_name = '$column'
            ) THEN
                ALTER TABLE $table ADD COLUMN $column $definition;
                RAISE NOTICE 'Added column $column to $table';
            ELSE
                RAISE NOTICE 'Column $column already exists in $table';
            END IF;
        END \$\$;
    "
}

# Helper function to create table if it doesn't exist
create_table_if_missing() {
    local table=$1
    local definition=$2
    
    psql -d $DB -c "
        DO \$\$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '$table') THEN
                EXECUTE '$definition';
                RAISE NOTICE 'Created table $table';
            ELSE
                RAISE NOTICE 'Table $table already exists';
            END IF;
        END \$\$;
    "
}

echo "[1] Checking api_keys table..."
add_column_if_missing "api_keys" "name" "VARCHAR(255) NOT NULL DEFAULT 'unnamed'"
add_column_if_missing "api_keys" "key" "TEXT NOT NULL DEFAULT ''"
add_column_if_missing "api_keys" "created_at" "TIMESTAMP DEFAULT NOW() NOT NULL"
add_column_if_missing "api_keys" "updated_at" "TIMESTAMP DEFAULT NOW() NOT NULL"

echo ""
echo "[2] Checking xp_transactions table..."
create_table_if_missing "xp_transactions" "CREATE TABLE xp_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    source VARCHAR(100) NOT NULL,
    source_id INTEGER,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
)"

echo ""
echo "[3] Checking achievements table..."
create_table_if_missing "achievements" "CREATE TABLE achievements (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(100),
    category VARCHAR(50) NOT NULL,
    xp_reward INTEGER DEFAULT 0 NOT NULL,
    requirement TEXT NOT NULL,
    hidden BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
)"

echo ""
echo "[4] Checking user_achievements table..."
create_table_if_missing "user_achievements" "CREATE TABLE user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id VARCHAR(255) NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0 NOT NULL,
    completed BOOLEAN DEFAULT FALSE NOT NULL,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
)"

echo ""
echo "[5] Checking servers table columns..."
add_column_if_missing "servers" "api_key" "TEXT UNIQUE"
add_column_if_missing "servers" "consecutive_failures" "INTEGER DEFAULT 0 NOT NULL"
add_column_if_missing "servers" "maintenance_mode" "BOOLEAN DEFAULT FALSE NOT NULL"
add_column_if_missing "servers" "maintenance_message" "TEXT"

echo ""
echo "[6] Checking server_xp table..."
create_table_if_missing "server_xp" "CREATE TABLE server_xp (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    xp INTEGER DEFAULT 0 NOT NULL,
    level INTEGER DEFAULT 0 NOT NULL,
    playtime_seconds INTEGER DEFAULT 0,
    last_synced_at TIMESTAMP DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
)"

echo ""
echo "[7] Checking users table XP columns..."
add_column_if_missing "users" "xp" "INTEGER DEFAULT 0 NOT NULL"
add_column_if_missing "users" "website_xp" "INTEGER DEFAULT 0 NOT NULL"
add_column_if_missing "users" "minecraft_xp" "INTEGER DEFAULT 0 NOT NULL"
add_column_if_missing "users" "level" "INTEGER DEFAULT 1 NOT NULL"
add_column_if_missing "users" "title" "VARCHAR(255)"

echo ""
echo "=== Migration Complete ==="
echo ""
echo "Run 'sudo -u postgres bash list_tables.sh' to verify the schema."
