# XP & Leveling System REST API Plan

This document outlines the architecture for synchronizing Minecraft server experience with the Vonix Network website to create a unified leveling system.

## 1. Overview

The goal is to combine a player's in-game progress (Minecraft XP) with their community engagement (Website XP) into a single "Global Level".

- **Global XP** = `Sum(Minecraft XP from all servers)` + `Website XP`
- **Global Level** = Calculated from Global XP using a custom curve (approx 1.5x - 2.5x standard MC curve).

## 2. API Endpoints

These endpoints will be used by the Minecraft Mod/Plugin to push data to the website.

### Authentication
All requests must include an `Authorization` header with a valid API Key.
`Authorization: Bearer <API_KEY>`

### Sync Player XP
`POST /api/minecraft/sync/xp`

**Request Body:**
```json
{
  "serverName": "Survival-1",
  "players": [
    {
      "uuid": "069a79f4-44e9-4726-a5be-fca90e38aaf5",
      "username": "Notch",
      "level": 30,
      "totalExperience": 1395,
      "currentHealth": 20.0,
      "playtimeSeconds": 3600
    },
    {
      "uuid": "...",
      "username": "...",
      "level": 15,
      "totalExperience": 315
    }
  ]
}
```

**Logic:**
1.  Website receives batch of player data.
2.  For each player:
    *   Find user by `minecraftUuid`.
    *   Update the `server_xp` record for this specific server.
    *   Recalculate `minecraftXp` (Sum of all `server_xp` entries for user).
    *   Recalculate `totalXp` (`minecraftXp` + `websiteXp`).
    *   Recalculate `level` based on `totalXp`.
    *   Save user record.

**Response:**
```json
{
  "success": true,
  "syncedCount": 2,
  "timestamp": "2025-12-03T20:00:00Z"
}
```

## 3. Database Schema Changes

### Users Table Updates
*   Add `websiteXp` (integer, default 0) - Tracks XP earned on site.
*   Add `minecraftXp` (integer, default 0) - Caches sum of all server XP.
*   Keep `xp` as the source of truth for Global XP.

### New Table: `server_xp`
Tracks XP per server to prevent double-counting or overwriting when playing on multiple servers.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | Integer (PK) | |
| `user_id` | Integer (FK) | Link to user |
| `server_id` | Integer (FK) | Link to server |
| `xp` | Integer | Raw Minecraft XP amount |
| `level` | Integer | Raw Minecraft Level (informational) |
| `last_updated` | Timestamp | |

## 4. XP Curve Logic

We will use a modified version of the modern Minecraft XP formula.

**Standard Minecraft XP to Level:**
*   **Level 0-16:** `XP = Level^2 + 6*Level`
*   **Level 17-31:** `XP = 2.5*Level^2 - 40.5*Level + 360`
*   **Level 32+:** `XP = 4.5*Level^2 - 162.5*Level + 2220`

**Global Level Formula:**
To achieve the "1.5x - 2.5x" feel (meaning it's harder to level up, or the levels go higher for same XP?), we will adjust the coefficients.
*   *Interpretation:* The user likely wants the *value* of the level to be higher, or the curve to be steeper.
*   *Decision:* We will implement a `getXpForLevel(level)` and `getLevelForXp(xp)` utility that applies a configurable multiplier (default 1.0, adjustable to 2.0) to the XP requirements.

## 5. Website XP Sources

Actions that award `websiteXp`:
*   **Daily Login:** +50 XP
*   **Forum Post:** +20 XP
*   **Forum Reply:** +5 XP
*   **Social Post:** +10 XP
*   **Comment:** +2 XP
*   **Like Received:** +1 XP

## 6. Security

*   API Route protected by Admin API Key (separate from user tokens).
*   Rate limited to prevent spam (e.g., sync every 5 minutes per server).
*   Validation of UUIDs to prevent spoofing.
