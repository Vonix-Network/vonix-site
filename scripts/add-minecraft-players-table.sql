-- Migration: Add minecraft_players table for XP tracking of unregistered players
-- This allows the leaderboard to show ALL Minecraft players, not just those registered on the website
-- Run this migration BEFORE deploying the updated XP sync API

-- PostgreSQL version
CREATE TABLE IF NOT EXISTS minecraft_players (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    username VARCHAR(255) NOT NULL,
    xp INTEGER DEFAULT 0 NOT NULL,
    level INTEGER DEFAULT 0 NOT NULL,
    playtime_seconds INTEGER DEFAULT 0,
    last_synced_at TIMESTAMP DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    linked_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Create index for faster UUID lookups
CREATE INDEX IF NOT EXISTS idx_minecraft_players_uuid ON minecraft_players(uuid);
CREATE INDEX IF NOT EXISTS idx_minecraft_players_username ON minecraft_players(username);
CREATE INDEX IF NOT EXISTS idx_minecraft_players_xp ON minecraft_players(xp DESC);

-- Optional: Populate from existing registered users who have Minecraft data
-- This pre-populates the table so the leaderboard shows them even if they later unlink
INSERT INTO minecraft_players (uuid, username, xp, level, playtime_seconds, linked_user_id)
SELECT 
    minecraft_uuid,
    minecraft_username,
    COALESCE(minecraft_xp, 0),
    COALESCE(level, 1),
    0,
    id
FROM users 
WHERE minecraft_uuid IS NOT NULL 
  AND minecraft_username IS NOT NULL
ON CONFLICT (uuid) DO NOTHING;

SELECT 'Migration complete! minecraft_players table created.' as status;

