-- PostgreSQL Schema Fix Script - ENHANCED VERSION
-- Handles mixed data types (strings, integers, timestamps) from SQLite migration
-- Run this on your PostgreSQL database to fix ALL type mismatches

-- ===================================================================
-- HELPER FUNCTION: Safely convert various formats to timestamp
-- ===================================================================
CREATE OR REPLACE FUNCTION safe_to_timestamp(input_value ANYELEMENT) 
RETURNS TIMESTAMP AS $$
BEGIN
    -- Handle NULL
    IF input_value IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Handle numeric (Unix timestamp in milliseconds)
    IF pg_typeof(input_value) IN ('bigint'::regtype, 'integer'::regtype, 'numeric'::regtype) 
       AND input_value::text ~ '^{10,13}$' THEN
        RETURN to_timestamp(input_value::bigint / 1000.0);
    END IF;
    
    -- Handle numeric (Unix timestamp in seconds)
    IF pg_typeof(input_value) IN ('bigint'::regtype, 'integer'::regtype, 'numeric'::regtype) 
       AND input_value::text ~ '^{9,10}$' THEN
        RETURN to_timestamp(input_value::bigint);
    END IF;
    
    -- Handle string that looks like a number (timestamp)
    IF pg_typeof(input_value) = 'text'::regtype AND input_value ~ '^{10,13}$' THEN
        RETURN to_timestamp(input_value::bigint / 1000.0);
    END IF;
    
    -- Handle string that looks like ISO timestamp
    IF pg_typeof(input_value) = 'text'::regtype AND input_value ~ '^{4}-{2}-{2}' THEN
        RETURN input_value::timestamp;
    END IF;
    
    -- Handle already valid timestamps
    IF pg_typeof(input_value) = 'timestamp'::regtype THEN
        RETURN input_value;
    END IF;
    
    -- Default: try direct conversion
    RETURN input_value::timestamp;
    
EXCEPTION 
    WHEN OTHERS THEN
        -- If all else fails, return current timestamp
        RETURN CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ===================================================================
-- HELPER FUNCTION: Safely convert to boolean
-- ===================================================================
CREATE OR REPLACE FUNCTION safe_to_boolean(input_value ANYELEMENT)
RETURNS BOOLEAN AS $$
BEGIN
    IF input_value IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Handle numeric (0/1)
    IF pg_typeof(input_value) IN ('integer'::regtype, 'bigint'::regtype, 'numeric'::regtype) THEN
        RETURN input_value::integer != 0;
    END IF;
    
    -- Handle string ('true'/'false', '1'/'0')
    IF pg_typeof(input_value) = 'text'::regtype THEN
        RETURN LOWER(input_value::text) IN ('true', '1', 'yes', 'on', 't');
    END IF;
    
    -- Handle already boolean
    IF pg_typeof(input_value) = 'boolean'::regtype THEN
        RETURN input_value::boolean;
    END IF;
    
    -- Default: try direct conversion
    RETURN input_value::boolean;
    
EXCEPTION 
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ===================================================================
-- USERS TABLE - FIX ALL TIMESTAMP COLUMNS
-- ===================================================================

ALTER TABLE users 
ALTER COLUMN rank_expires_at TYPE timestamp USING safe_to_timestamp(rank_expires_at);

ALTER TABLE users 
ALTER COLUMN paused_at TYPE timestamp USING safe_to_timestamp(paused_at);

ALTER TABLE users 
ALTER COLUMN last_login_at TYPE timestamp USING safe_to_timestamp(last_login_at);

ALTER TABLE users 
ALTER COLUMN locked_until TYPE timestamp USING safe_to_timestamp(locked_until);

ALTER TABLE users 
ALTER COLUMN last_seen_at TYPE timestamp USING safe_to_timestamp(last_seen_at);

ALTER TABLE users 
ALTER COLUMN created_at TYPE timestamp USING safe_to_timestamp(created_at);

ALTER TABLE users 
ALTER COLUMN updated_at TYPE timestamp USING safe_to_timestamp(updated_at);

-- ===================================================================
-- REGISTRATION CODES TABLE - CRITICAL FOR REGISTRATION FLOW
-- ===================================================================

ALTER TABLE registration_codes 
ALTER COLUMN expires_at TYPE timestamp USING safe_to_timestamp(expires_at);

ALTER TABLE registration_codes 
ALTER COLUMN created_at TYPE timestamp USING safe_to_timestamp(created_at);

ALTER TABLE registration_codes 
ALTER COLUMN used_at TYPE timestamp USING safe_to_timestamp(used_at);

-- ===================================================================
-- SERVERS TABLE
-- ===================================================================

ALTER TABLE servers 
ALTER COLUMN created_at TYPE timestamp USING safe_to_timestamp(created_at);

ALTER TABLE servers 
ALTER COLUMN updated_at TYPE timestamp USING safe_to_timestamp(updated_at);

ALTER TABLE servers 
ALTER COLUMN maintenance_mode TYPE boolean USING safe_to_boolean(maintenance_mode);

ALTER TABLE servers 
ALTER COLUMN hide_port TYPE boolean USING safe_to_boolean(hide_port);

-- ===================================================================
-- SERVER_UPTIME_RECORDS TABLE
-- ===================================================================

ALTER TABLE server_uptime_records 
ALTER COLUMN checked_at TYPE timestamp USING safe_to_timestamp(checked_at);

ALTER TABLE server_uptime_records 
ALTER COLUMN online TYPE boolean USING safe_to_boolean(online);

-- ===================================================================
-- NOTIFICATIONS TABLE
-- ===================================================================

ALTER TABLE notifications 
ALTER COLUMN created_at TYPE timestamp USING safe_to_timestamp(created_at);

ALTER TABLE notifications 
ALTER COLUMN read TYPE boolean USING safe_to_boolean(read);

-- ===================================================================
-- DISCORD_MESSAGES TABLE
-- ===================================================================

ALTER TABLE discord_messages 
ALTER COLUMN created_at TYPE timestamp USING safe_to_timestamp(created_at);

ALTER TABLE discord_messages 
ALTER COLUMN is_from_web TYPE boolean USING safe_to_boolean(is_from_web);

-- ===================================================================
-- SESSIONS TABLE
-- ===================================================================

ALTER TABLE sessions 
ALTER COLUMN expires_at TYPE timestamp USING safe_to_timestamp(expires_at);

ALTER TABLE sessions 
ALTER COLUMN created_at TYPE timestamp USING safe_to_timestamp(created_at);

-- ===================================================================
-- API_KEYS TABLE - CRITICAL FOR MINECRAFT INTEGRATION
-- ===================================================================

ALTER TABLE api_keys 
ALTER COLUMN created_at TYPE timestamp USING safe_to_timestamp(created_at);

ALTER TABLE api_keys 
ALTER COLUMN updated_at TYPE timestamp USING safe_to_timestamp(updated_at);

-- ===================================================================
-- OTHER TABLES
-- ===================================================================

-- verification_tokens
ALTER TABLE verification_tokens 
ALTER COLUMN expires_at TYPE timestamp USING safe_to_timestamp(expires_at);
ALTER TABLE verification_tokens 
ALTER COLUMN created_at TYPE timestamp USING safe_to_timestamp(created_at);

-- password_reset_tokens
ALTER TABLE password_reset_tokens 
ALTER COLUMN expires_at TYPE timestamp USING safe_to_timestamp(expires_at);
ALTER TABLE password_reset_tokens 
ALTER COLUMN created_at TYPE timestamp USING safe_to_timestamp(created_at);
ALTER TABLE password_reset_tokens 
ALTER COLUMN used_at TYPE timestamp USING safe_to_timestamp(used_at);

-- forum_posts
ALTER TABLE forum_posts 
ALTER COLUMN created_at TYPE timestamp USING safe_to_timestamp(created_at);
ALTER TABLE forum_posts 
ALTER COLUMN updated_at TYPE timestamp USING safe_to_timestamp(updated_at);

-- forum_replies
ALTER TABLE forum_replies 
ALTER COLUMN created_at TYPE timestamp USING safe_to_timestamp(created_at);
ALTER TABLE forum_replies 
ALTER COLUMN updated_at TYPE timestamp USING safe_to_timestamp(updated_at);

-- donations
ALTER TABLE donations 
ALTER COLUMN created_at TYPE timestamp USING safe_to_timestamp(created_at);

-- announcements
ALTER TABLE announcements 
ALTER COLUMN expires_at TYPE timestamp USING safe_to_timestamp(expires_at);
ALTER TABLE announcements 
ALTER COLUMN created_at TYPE timestamp USING safe_to_timestamp(created_at);
ALTER TABLE announcements 
ALTER COLUMN updated_at TYPE timestamp USING safe_to_timestamp(updated_at);

-- tickets
ALTER TABLE support_tickets 
ALTER COLUMN created_at TYPE timestamp USING safe_to_timestamp(created_at);
ALTER TABLE support_tickets 
ALTER COLUMN updated_at TYPE timestamp USING safe_to_timestamp(updated_at);

-- ticket_messages
ALTER TABLE ticket_messages 
ALTER COLUMN created_at TYPE timestamp USING safe_to_timestamp(created_at);

-- events
ALTER TABLE events 
ALTER COLUMN start_time TYPE timestamp USING safe_to_timestamp(start_time);
ALTER TABLE events 
ALTER COLUMN end_time TYPE timestamp USING safe_to_timestamp(end_time);
ALTER TABLE events 
ALTER COLUMN created_at TYPE timestamp USING safe_to_timestamp(created_at);

-- ===================================================================
-- VERIFICATION - Check the conversion worked
-- ===================================================================

SELECT 'registration_codes' as table_name, 
       code, 
       expires_at, 
       pg_typeof(expires_at) as column_type
FROM registration_codes 
ORDER BY id DESC 
LIMIT 5;

SELECT 'users' as table_name, 
       username, 
       created_at, 
       last_login_at,
       pg_typeof(created_at) as created_at_type,
       pg_typeof(last_login_at) as last_login_at_type
FROM users 
ORDER BY id DESC 
LIMIT 5;

SELECT 'api_keys' as table_name, 
       name, 
       created_at, 
       pg_typeof(created_at) as column_type
FROM api_keys 
ORDER BY id DESC 
LIMIT 5;

-- ===================================================================
-- CLEANUP (optional - remove helper functions after successful migration)
-- ===================================================================
-- DROP FUNCTION safe_to_timestamp(ANYELEMENT);
-- DROP FUNCTION safe_to_boolean(ANYELEMENT);