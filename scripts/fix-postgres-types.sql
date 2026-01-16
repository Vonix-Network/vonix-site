-- PostgreSQL Schema Fix Script
-- Run this on your PostgreSQL database to fix type mismatches
-- These columns were created with SQLite-style types and need to be converted

-- ===================================================================
-- FIX TIMESTAMP COLUMNS (bigint → timestamp)
-- ===================================================================

-- server_uptime_records
ALTER TABLE server_uptime_records 
ALTER COLUMN checked_at TYPE timestamp 
USING to_timestamp(checked_at);

-- discord_messages
ALTER TABLE discord_messages 
ALTER COLUMN created_at TYPE timestamp 
USING to_timestamp(created_at);

-- notifications
ALTER TABLE notifications 
ALTER COLUMN created_at TYPE timestamp 
USING to_timestamp(created_at);

-- servers (if needed)
ALTER TABLE servers 
ALTER COLUMN created_at TYPE timestamp 
USING to_timestamp(created_at);

ALTER TABLE servers 
ALTER COLUMN updated_at TYPE timestamp 
USING to_timestamp(updated_at);

-- users (if needed)
ALTER TABLE users 
ALTER COLUMN created_at TYPE timestamp 
USING to_timestamp(created_at);

ALTER TABLE users 
ALTER COLUMN updated_at TYPE timestamp 
USING to_timestamp(updated_at);

-- users.locked_until - critical for login!
ALTER TABLE users 
ALTER COLUMN locked_until TYPE timestamp 
USING to_timestamp(locked_until);

-- ===================================================================
-- FIX BOOLEAN COLUMNS (bigint → boolean)
-- ===================================================================

-- server_uptime_records
ALTER TABLE server_uptime_records 
ALTER COLUMN online TYPE boolean 
USING (online::int::boolean);

-- discord_messages
ALTER TABLE discord_messages 
ALTER COLUMN is_from_web TYPE boolean 
USING (is_from_web::int::boolean);

-- notifications
ALTER TABLE notifications 
ALTER COLUMN read TYPE boolean 
USING (read::int::boolean);

-- servers (new columns)
ALTER TABLE servers 
ALTER COLUMN maintenance_mode TYPE boolean 
USING (maintenance_mode::int::boolean);

ALTER TABLE servers 
ALTER COLUMN hide_port TYPE boolean 
USING (hide_port::int::boolean);

-- ===================================================================
-- VERIFICATION QUERY
-- Run this after to verify the types are correct
-- ===================================================================

SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name IN ('server_uptime_records', 'discord_messages', 'notifications', 'servers')
AND column_name IN ('checked_at', 'created_at', 'updated_at', 'online', 'is_from_web', 'read', 'maintenance_mode', 'hide_port')
ORDER BY table_name, column_name;
