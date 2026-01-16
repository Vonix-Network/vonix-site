-- PostgreSQL Schema Fix Script - COMPREHENSIVE
-- Run this on your PostgreSQL database to fix ALL type mismatches
-- These columns were created with SQLite-style types and need to be converted

-- ===================================================================
-- USERS TABLE - FIX ALL TIMESTAMP COLUMNS
-- ===================================================================

ALTER TABLE users ALTER COLUMN rank_expires_at TYPE timestamp USING to_timestamp(rank_expires_at);
ALTER TABLE users ALTER COLUMN paused_at TYPE timestamp USING to_timestamp(paused_at);
ALTER TABLE users ALTER COLUMN last_login_at TYPE timestamp USING to_timestamp(last_login_at);
ALTER TABLE users ALTER COLUMN locked_until TYPE timestamp USING to_timestamp(locked_until);
ALTER TABLE users ALTER COLUMN last_seen_at TYPE timestamp USING to_timestamp(last_seen_at);
ALTER TABLE users ALTER COLUMN created_at TYPE timestamp USING to_timestamp(created_at);
ALTER TABLE users ALTER COLUMN updated_at TYPE timestamp USING to_timestamp(updated_at);

-- ===================================================================
-- SERVERS TABLE
-- ===================================================================

ALTER TABLE servers ALTER COLUMN created_at TYPE timestamp USING to_timestamp(created_at);
ALTER TABLE servers ALTER COLUMN updated_at TYPE timestamp USING to_timestamp(updated_at);
ALTER TABLE servers ALTER COLUMN maintenance_mode TYPE boolean USING (maintenance_mode::int::boolean);
ALTER TABLE servers ALTER COLUMN hide_port TYPE boolean USING (hide_port::int::boolean);

-- ===================================================================
-- SERVER_UPTIME_RECORDS TABLE
-- ===================================================================

ALTER TABLE server_uptime_records ALTER COLUMN checked_at TYPE timestamp USING to_timestamp(checked_at);
ALTER TABLE server_uptime_records ALTER COLUMN online TYPE boolean USING (online::int::boolean);

-- ===================================================================
-- NOTIFICATIONS TABLE
-- ===================================================================

ALTER TABLE notifications ALTER COLUMN created_at TYPE timestamp USING to_timestamp(created_at);
ALTER TABLE notifications ALTER COLUMN read TYPE boolean USING (read::int::boolean);

-- ===================================================================
-- DISCORD_MESSAGES TABLE
-- ===================================================================

ALTER TABLE discord_messages ALTER COLUMN created_at TYPE timestamp USING to_timestamp(created_at);
ALTER TABLE discord_messages ALTER COLUMN is_from_web TYPE boolean USING (is_from_web::int::boolean);

-- ===================================================================
-- SESSIONS TABLE
-- ===================================================================

ALTER TABLE sessions ALTER COLUMN expires_at TYPE timestamp USING to_timestamp(expires_at);
ALTER TABLE sessions ALTER COLUMN created_at TYPE timestamp USING to_timestamp(created_at);

-- ===================================================================
-- OTHER COMMON TABLES
-- ===================================================================

-- verification_tokens
ALTER TABLE verification_tokens ALTER COLUMN expires_at TYPE timestamp USING to_timestamp(expires_at);
ALTER TABLE verification_tokens ALTER COLUMN created_at TYPE timestamp USING to_timestamp(created_at);

-- password_reset_tokens
ALTER TABLE password_reset_tokens ALTER COLUMN expires_at TYPE timestamp USING to_timestamp(expires_at);
ALTER TABLE password_reset_tokens ALTER COLUMN created_at TYPE timestamp USING to_timestamp(created_at);
ALTER TABLE password_reset_tokens ALTER COLUMN used_at TYPE timestamp USING to_timestamp(used_at);

-- forum_posts
ALTER TABLE forum_posts ALTER COLUMN created_at TYPE timestamp USING to_timestamp(created_at);
ALTER TABLE forum_posts ALTER COLUMN updated_at TYPE timestamp USING to_timestamp(updated_at);

-- forum_replies
ALTER TABLE forum_replies ALTER COLUMN created_at TYPE timestamp USING to_timestamp(created_at);
ALTER TABLE forum_replies ALTER COLUMN updated_at TYPE timestamp USING to_timestamp(updated_at);

-- donations
ALTER TABLE donations ALTER COLUMN created_at TYPE timestamp USING to_timestamp(created_at);

-- announcements
ALTER TABLE announcements ALTER COLUMN expires_at TYPE timestamp USING to_timestamp(expires_at);
ALTER TABLE announcements ALTER COLUMN created_at TYPE timestamp USING to_timestamp(created_at);
ALTER TABLE announcements ALTER COLUMN updated_at TYPE timestamp USING to_timestamp(updated_at);

-- tickets
ALTER TABLE tickets ALTER COLUMN created_at TYPE timestamp USING to_timestamp(created_at);
ALTER TABLE tickets ALTER COLUMN updated_at TYPE timestamp USING to_timestamp(updated_at);

-- ticket_messages
ALTER TABLE ticket_messages ALTER COLUMN created_at TYPE timestamp USING to_timestamp(created_at);

-- events
ALTER TABLE events ALTER COLUMN start_time TYPE timestamp USING to_timestamp(start_time);
ALTER TABLE events ALTER COLUMN end_time TYPE timestamp USING to_timestamp(end_time);
ALTER TABLE events ALTER COLUMN created_at TYPE timestamp USING to_timestamp(created_at);

-- api_keys
ALTER TABLE api_keys ALTER COLUMN created_at TYPE timestamp USING to_timestamp(created_at);
ALTER TABLE api_keys ALTER COLUMN updated_at TYPE timestamp USING to_timestamp(updated_at);

-- ===================================================================
-- VERIFICATION - Check types are now correct
-- ===================================================================

SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users'
AND column_name IN ('rank_expires_at', 'paused_at', 'last_login_at', 'locked_until', 'last_seen_at', 'created_at', 'updated_at')
ORDER BY column_name;
