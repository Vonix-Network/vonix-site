-- PostgreSQL Quick Fix for Registration System
-- Run these commands individually in psql to fix the immediate issues

-- First, let's see what tables actually exist
\dt

-- If tables don't exist, we need to create them first
-- This is a simplified version for the critical registration tables

-- Create users table (simplified version)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255),
    password TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'user' NOT NULL,
    minecraft_username VARCHAR(255) UNIQUE,
    minecraft_uuid VARCHAR(36) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    rank_expires_at TIMESTAMP,
    paused_at TIMESTAMP,
    locked_until TIMESTAMP,
    last_seen_at TIMESTAMP
);

-- Create registration_codes table (critical for Minecraft registration)
CREATE TABLE IF NOT EXISTS registration_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(255) NOT NULL UNIQUE,
    minecraft_username VARCHAR(255) NOT NULL,
    minecraft_uuid VARCHAR(36) NOT NULL,
    used BOOLEAN DEFAULT FALSE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP
);

-- Create api_keys table (critical for Minecraft mod authentication)
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    key TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Verify tables were created
\dt

-- Check the current data types
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('users', 'registration_codes', 'api_keys')
AND column_name LIKE '%at'
ORDER BY table_name, column_name;

-- If you see any columns with data types like 'integer' or 'text' that should be 'timestamp',
-- run these specific fixes:

-- Fix registration_codes timestamps (most critical for registration flow)
ALTER TABLE registration_codes 
ALTER COLUMN expires_at TYPE TIMESTAMP USING 
    CASE 
        WHEN expires_at IS NULL THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes'
        WHEN pg_typeof(expires_at) = 'integer'::regtype THEN to_timestamp(expires_at::bigint / 1000.0)
        WHEN pg_typeof(expires_at) = 'bigint'::regtype THEN to_timestamp(expires_at::bigint / 1000.0)
        ELSE expires_at::timestamp
    END;

ALTER TABLE registration_codes 
ALTER COLUMN created_at TYPE TIMESTAMP USING 
    CASE 
        WHEN created_at IS NULL THEN CURRENT_TIMESTAMP
        WHEN pg_typeof(created_at) = 'integer'::regtype THEN to_timestamp(created_at::bigint / 1000.0)
        WHEN pg_typeof(created_at) = 'bigint'::regtype THEN to_timestamp(created_at::bigint / 1000.0)
        ELSE created_at::timestamp
    END;

ALTER TABLE registration_codes 
ALTER COLUMN used_at TYPE TIMESTAMP USING 
    CASE 
        WHEN used_at IS NULL THEN NULL
        WHEN pg_typeof(used_at) = 'integer'::regtype THEN to_timestamp(used_at::bigint / 1000.0)
        WHEN pg_typeof(used_at) = 'bigint'::regtype THEN to_timestamp(used_at::bigint / 1000.0)
        ELSE used_at::timestamp
    END;

-- Fix api_keys timestamps
ALTER TABLE api_keys 
ALTER COLUMN created_at TYPE TIMESTAMP USING 
    CASE 
        WHEN created_at IS NULL THEN CURRENT_TIMESTAMP
        WHEN pg_typeof(created_at) = 'integer'::regtype THEN to_timestamp(created_at::bigint / 1000.0)
        WHEN pg_typeof(created_at) = 'bigint'::regtype THEN to_timestamp(created_at::bigint / 1000.0)
        ELSE created_at::timestamp
    END;

ALTER TABLE api_keys 
ALTER COLUMN updated_at TYPE TIMESTAMP USING 
    CASE 
        WHEN updated_at IS NULL THEN CURRENT_TIMESTAMP
        WHEN pg_typeof(updated_at) = 'integer'::regtype THEN to_timestamp(updated_at::bigint / 1000.0)
        WHEN pg_typeof(updated_at) = 'bigint'::regtype THEN to_timestamp(updated_at::bigint / 1000.0)
        ELSE updated_at::timestamp
    END;

-- Final verification
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('users', 'registration_codes', 'api_keys')
AND column_name LIKE '%at'
ORDER BY table_name, column_name;

-- Test with sample data (optional)
INSERT INTO api_keys (name, key) VALUES ('test-key', 'vnx_test_key_123') ON CONFLICT DO NOTHING;
INSERT INTO registration_codes (code, minecraft_username, minecraft_uuid, expires_at) 
VALUES ('TEST123', 'testuser', '12345678-1234-1234-1234-123456789012', CURRENT_TIMESTAMP + INTERVAL '15 minutes') 
ON CONFLICT DO NOTHING;

-- Verify the data looks correct
SELECT * FROM api_keys;
SELECT * FROM registration_codes;