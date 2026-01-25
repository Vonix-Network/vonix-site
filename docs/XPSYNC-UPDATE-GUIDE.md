# XP Sync Update Guide (v1.1.1)

This update adds support for tracking XP of **ALL Minecraft players** on the leaderboard, not just those registered on the website.

## What Changed

### 1. New `minecraft_players` Table
A new database table stores XP data for unregistered Minecraft players. This allows:
- **All players** to appear on the leaderboard (registered or not)
- XP is preserved when players haven't registered yet
- When a player registers, their XP is automatically linked

### 2. Updated XP Sync API
The `/api/minecraft/sync/xp` endpoint now:
- Syncs **all players** from the Minecraft server
- Registered users → stored in `server_xp` table (aggregated to user's total)
- Unregistered players → stored in `minecraft_players` table
- Response now includes `registeredCount` and `unregisteredCount`

### 3. Updated Leaderboard API
The `/api/leaderboard` endpoint now:
- Shows both registered users and unregistered Minecraft players
- Unregistered players have `isRegistered: false` in the response
- Sorting works across both types

---

## Migration Steps

### Step 1: Run Database Migration

#### Option A: From root terminal with psql (PostgreSQL)

```bash
# Run as root or with sudo
sudo -u postgres psql -d vonix -c "
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

CREATE INDEX IF NOT EXISTS idx_minecraft_players_uuid ON minecraft_players(uuid);
CREATE INDEX IF NOT EXISTS idx_minecraft_players_username ON minecraft_players(username);
CREATE INDEX IF NOT EXISTS idx_minecraft_players_xp ON minecraft_players(xp DESC);
"
```

#### Option B: Single-line command

```bash
sudo -u postgres psql -d vonix -f /path/to/Vonix-Network-Site/scripts/add-minecraft-players-table.sql
```

#### Option C: Using drizzle-kit push (development)

```bash
cd /path/to/Vonix-Network-Site
npm run db:push
```

### Step 2: (Optional) Pre-populate with existing registered users

This creates entries in `minecraft_players` for users who already have Minecraft accounts linked:

```bash
sudo -u postgres psql -d vonix -c "
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
"
```

### Step 3: Deploy Website Updates

```bash
cd /path/to/Vonix-Network-Site
git pull
npm install
npm run build
# Restart your Next.js server
```

### Step 4: Update VonixCore Mod

Deploy the updated VonixCore mod (v1.1.1) to your Minecraft server(s).

The mod will now sync ALL players' XP data on:
- Server startup (reads all player data files)
- Regular intervals (online players only)
- Server shutdown (final sync of all players)

---

## Verification

### Check the migration worked:

```bash
sudo -u postgres psql -d vonix -c "SELECT COUNT(*) FROM minecraft_players;"
```

### Check XP sync is working:

Look at the Minecraft server logs for messages like:
```
[XPSync] Successfully synced X players
[XPSync] Completed: X total (Y registered, Z unregistered)
```

### Test the leaderboard API:

```bash
curl https://your-site.com/api/leaderboard | jq
```

You should see entries with both `"isRegistered": true` and `"isRegistered": false`.

---

## Troubleshooting

### "0 synced users" still showing

1. **Check API key is valid**: Ensure `api_key` in `vonixcore-xpsync.toml` matches an entry in the `api_keys` table
2. **Check server name matches**: The `server_name` in config must match a server in the `servers` table
3. **Check API endpoint**: Ensure `endpoint` points to your website's XP sync API

### Players not appearing on leaderboard

1. Wait for the next sync interval (default: 5 minutes)
2. Or restart the Minecraft server to trigger immediate sync
3. Check the `minecraft_players` table has data:
   ```bash
   sudo -u postgres psql -d vonix -c "SELECT * FROM minecraft_players LIMIT 10;"
   ```

### UUID format issues

The updated API normalizes UUIDs automatically (handles with/without dashes).

---

## Schema Changes Summary

### New Table: `minecraft_players`

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| uuid | VARCHAR(36) | Minecraft UUID (unique) |
| username | VARCHAR(255) | Current Minecraft username |
| xp | INTEGER | Total XP (high-water mark) |
| level | INTEGER | Minecraft level |
| playtime_seconds | INTEGER | Total playtime in seconds |
| last_synced_at | TIMESTAMP | Last sync time |
| created_at | TIMESTAMP | Record creation time |
| linked_user_id | INTEGER | FK to users table (null if unregistered) |

---

## Rollback (if needed)

To remove the new table and revert to previous behavior:

```bash
sudo -u postgres psql -d vonix -c "DROP TABLE IF EXISTS minecraft_players;"
```

Then redeploy the previous version of the website code.

