# Minecraft Integration Documentation

## Overview

The Vonix Network uses a **Minecraft-first username system** where:
- **Usernames are always Minecraft usernames** (no separate display names)
- **UUIDs are fetched and validated** via Mojang API during registration
- **Profile pictures default to minotar.net** 3D cube heads
- **Custom avatars are optional** (users can set a custom image URL)
- **Automatic username syncing** checks for MC name changes hourly

## Avatar System

### Default Avatars (minotar.net)

All users get Minecraft 3D cube heads by default:

```
https://minotar.net/cube/{username}/100.png
```

**Available styles:**
- `cube` - 3D isometric head (default)
- `avatar` - 2D face
- `helm` - Face with helmet overlay

### Custom Avatars

Users can optionally set a custom avatar URL in their settings:

```typescript
// Database field
users.avatar: text('avatar')

// Usage in components
import { getUserAvatarUrl } from '@/lib/utils';

const avatarUrl = getUserAvatarUrl(
  minecraftUsername,
  customAvatar, // null if not set
  100 // size
);
```

**Priority:**
1. Custom avatar (if set)
2. Minotar.net Minecraft avatar

## Registration Flow

### 1. In-Game Registration

Player runs `/register` command in Minecraft:

```java
// Minecraft mod calls API
POST /api/minecraft/register
Headers: {
  "x-api-key": "vnx_..."
}
Body: {
  "minecraftUsername": "Notch" // Just username, not UUID
}
```

**API validates username via Mojang:**

```typescript
// Validates username exists
const profile = await fetchMinecraftUUID(username);

// Returns:
{
  id: "069a79f4-44e9-4726-a5be-fca90e38aaf5",
  name: "Notch" // With correct capitalization
}
```

**Response:**

```json
{
  "success": true,
  "code": "A1B2C3D4",
  "expiresAt": "2024-12-03T21:15:00Z",
  "minecraftUsername": "Notch",
  "minecraftUuid": "069a79f4-44e9-4726-a5be-fca90e38aaf5",
  "message": "Registration code generated for Notch. Code expires in 15 minutes."
}
```

### 2. Website Registration

User visits website and enters:
- Registration code
- Email (optional)
- Password

**No username field** - username is automatically set to Minecraft username.

```typescript
// Registration creates user
{
  username: "Notch", // From registration code
  minecraftUsername: "Notch",
  minecraftUuid: "069a79f4-44e9-4726-a5be-fca90e38aaf5",
  email: "user@example.com",
  password: "hashed_password",
  avatar: null // No custom avatar yet
}
```

## Username Syncing

### Automatic Sync (Hourly)

An in-app cron job runs every hour to check for username changes:

```typescript
// src/lib/cron.ts
cronManager.register('sync-usernames', 60 * 60 * 1000, async () => {
  // Calls /api/cron/sync-usernames
});
```

**How it works:**

1. Fetch all users with Minecraft UUIDs
2. For each user, query Mojang API with UUID
3. Check if current username differs from stored username
4. Update database if changed

```typescript
// Example sync
const currentUsername = await fetchMinecraftUsername(uuid);

if (currentUsername !== storedUsername) {
  // Update both fields
  await db.update(users).set({
    username: currentUsername,
    minecraftUsername: currentUsername,
    updatedAt: new Date(),
  });
}
```

**Rate limiting:**
- 100ms delay between requests
- Max 10 requests/second to Mojang API

### Manual Sync

Admins can trigger manual sync:

```bash
curl -X POST http://localhost:3000/api/cron/sync-usernames \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

## Mojang API Integration

### Fetch UUID from Username

```typescript
import { fetchMinecraftUUID } from '@/lib/minecraft';

const profile = await fetchMinecraftUUID('Notch');
// Returns: { id: '069a79f4...', name: 'Notch' }
// Returns: null if username doesn't exist
```

### Fetch Username from UUID

```typescript
import { fetchMinecraftUsername } from '@/lib/minecraft';

const username = await fetchMinecraftUsername('069a79f4-44e9-4726-a5be-fca90e38aaf5');
// Returns: 'Notch'
// Returns: null if UUID doesn't exist
```

### UUID Formatting

```typescript
import { formatUUID } from '@/lib/minecraft';

// With dashes
const formatted = formatUUID('069a79f444e94726a5befca90e38aaf5');
// Returns: '069a79f4-44e9-4726-a5be-fca90e38aaf5'
```

### Batch Lookups

```typescript
import { batchFetchUUIDs } from '@/lib/minecraft';

const profiles = await batchFetchUUIDs(['Notch', 'jeb_', 'Dinnerbone']);
// Returns array of profiles (max 10 per request)
```

## Avatar Components

### Using getUserAvatarUrl

```tsx
import { getUserAvatarUrl } from '@/lib/utils';
import Image from 'next/image';

function UserAvatar({ user }) {
  const avatarUrl = getUserAvatarUrl(
    user.minecraftUsername,
    user.avatar, // Custom avatar URL (nullable)
    100
  );

  return (
    <Image
      src={avatarUrl}
      alt={user.username}
      width={100}
      height={100}
    />
  );
}
```

### Avatar Component with Fallback

```tsx
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getUserAvatarUrl, getInitials } from '@/lib/utils';

function UserAvatarWithFallback({ user }) {
  return (
    <Avatar className="w-10 h-10">
      <AvatarImage
        src={getUserAvatarUrl(user.minecraftUsername, user.avatar)}
        alt={user.username}
      />
      <AvatarFallback>
        {getInitials(user.username)}
      </AvatarFallback>
    </Avatar>
  );
}
```

## Database Schema

```typescript
users {
  id: integer,
  username: text,                // ALWAYS matches minecraftUsername
  minecraftUsername: text,       // Current MC username
  minecraftUuid: text,           // Immutable UUID
  avatar: text | null,           // Optional custom avatar URL
  // ... other fields
}
```

**Important:**
- `username` and `minecraftUsername` are always synced
- `minecraftUuid` never changes (tied to Mojang account)
- `avatar` is optional - if null, use minotar.net

## In-App Cron System

### How It Works

```typescript
// src/instrumentation.ts
// Runs once on server startup

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeCronJobs } = await import('./lib/cron');
    initializeCronJobs();
  }
}
```

### Registered Jobs

| Job | Interval | Description |
|-----|----------|-------------|
| `sync-usernames` | 1 hour | Check for MC username changes |
| `expire-ranks` | 1 hour | Remove expired donation ranks |
| `update-servers` | 5 minutes | Update MC server status |

### Monitoring Cron Jobs

```bash
# Admin API endpoint
GET /api/admin/cron-status

# Response
{
  "success": true,
  "jobs": [
    {
      "name": "sync-usernames",
      "running": false,
      "scheduleMinutes": 60,
      "lastRun": "2024-12-03T20:00:00Z",
      "nextRun": "2024-12-03T21:00:00Z",
      "isActive": true
    }
  ]
}
```

## Configuration

### Environment Variables

```env
# Required for registration validation
# None - uses public Mojang API

# Optional for cron authentication
CRON_SECRET=your-secret-key

# App URL for cron job self-calls
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Image Domains

Already configured in `next.config.ts`:

```typescript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'minotar.net', // Primary avatar source
    },
  ],
}
```

## User Settings

### Changing Custom Avatar

```typescript
// API route (future implementation)
PUT /api/user/avatar
Body: {
  avatarUrl: "https://example.com/custom-avatar.png"
}

// Or set to null to use Minecraft avatar
Body: {
  avatarUrl: null
}
```

### Validation

Custom avatar URLs should be:
- Valid HTTPS URLs
- Publicly accessible
- Image file (checked via Content-Type or extension)
- Reasonable size (< 5MB)

## API Reference

### POST /api/minecraft/register

Generate registration code.

**Headers:**
- `x-api-key`: API key from Minecraft server

**Body:**
```json
{
  "minecraftUsername": "Notch"
}
```

**Response:**
```json
{
  "success": true,
  "code": "A1B2C3D4",
  "expiresAt": "2024-12-03T21:15:00Z",
  "minecraftUsername": "Notch",
  "minecraftUuid": "069a79f4-44e9-4726-a5be-fca90e38aaf5"
}
```

### GET /api/minecraft/register?uuid=UUID

Check if player is registered.

**Response:**
```json
{
  "registered": true,
  "userId": 123
}
```

### GET /api/cron/sync-usernames

Sync all Minecraft usernames (hourly cron or manual trigger).

**Headers:**
- `Authorization`: `Bearer ${CRON_SECRET}`

**Response:**
```json
{
  "success": true,
  "synced": 3,
  "unchanged": 47,
  "errors": 0,
  "total": 50,
  "changes": [
    {
      "userId": 123,
      "oldUsername": "OldName",
      "newUsername": "NewName"
    }
  ],
  "timestamp": "2024-12-03T20:00:00Z"
}
```

### GET /api/admin/cron-status

Get cron job status (admin only).

**Response:**
```json
{
  "success": true,
  "jobs": [...],
  "timestamp": "2024-12-03T20:00:00Z"
}
```

## Benefits of This System

✅ **No username conflicts** - MC usernames are globally unique
✅ **Automatic validation** - Mojang API ensures valid usernames
✅ **Username sync** - Catches player name changes automatically
✅ **No manual avatar uploads** - minotar.net provides MC skins
✅ **Optional customization** - Users can override with custom avatars
✅ **Immutable identity** - UUIDs never change
✅ **In-app cron** - No system dependencies

## Troubleshooting

### Username Not Syncing

1. Check cron job is running:
   ```bash
   curl http://localhost:3000/api/admin/cron-status
   ```

2. Check cron logs in terminal

3. Manually trigger sync:
   ```bash
   curl -X POST http://localhost:3000/api/cron/sync-usernames \
     -H "Authorization: Bearer ${CRON_SECRET}"
   ```

### Invalid Username During Registration

- Ensure username exists in Minecraft (check namemc.com)
- Check Mojang API status
- Verify API key is valid

### Avatar Not Loading

1. Check minotar.net is accessible
2. Verify username is correct
3. Check Next.js image configuration
4. Try clearing browser cache

### Cron Jobs Not Starting

1. Check `src/instrumentation.ts` exists
2. Verify experimental.instrumentationHook in next.config (Next 14)
3. Check server logs for initialization messages
4. Restart development server

---

**For more information:**
- [Mojang API Documentation](https://wiki.vg/Mojang_API)
- [minotar.net](https://minotar.net/)
- [Next.js Instrumentation](https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation)
