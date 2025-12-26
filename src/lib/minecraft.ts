/**
 * Minecraft API Integration
 * Functions for validating usernames and fetching UUIDs from Mojang API
 */

interface MinecraftProfile {
  id: string;
  name: string;
}

/**
 * Fetch Minecraft UUID from username using Mojang API
 * @param username - Minecraft username
 * @returns UUID and current username, or null if not found
 */
export async function fetchMinecraftUUID(username: string): Promise<MinecraftProfile | null> {
  try {
    const response = await fetch(
      `https://api.mojang.com/users/profiles/minecraft/${username}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Username doesn't exist
      }
      throw new Error(`Mojang API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      name: data.name, // Current username (may differ from input if case differs)
    };
  } catch (error: any) {
    console.error('Error fetching Minecraft UUID:', error);
    return null;
  }
}

/**
 * Fetch current username from UUID using Mojang API
 * @param uuid - Minecraft UUID (with or without dashes)
 * @returns Current username, or null if not found
 */
export async function fetchMinecraftUsername(uuid: string): Promise<string | null> {
  try {
    // Remove dashes from UUID
    const cleanUuid = uuid.replace(/-/g, '');
    
    const response = await fetch(
      `https://sessionserver.mojang.com/session/minecraft/profile/${cleanUuid}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Mojang API error: ${response.status}`);
    }

    const data = await response.json();
    return data.name;
  } catch (error: any) {
    console.error('Error fetching Minecraft username:', error);
    return null;
  }
}

/**
 * Validate that a Minecraft username exists
 * @param username - Username to validate
 * @returns true if username exists, false otherwise
 */
export async function validateMinecraftUsername(username: string): Promise<boolean> {
  const profile = await fetchMinecraftUUID(username);
  return profile !== null;
}

/**
 * Format UUID with dashes (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
 * @param uuid - UUID without dashes
 * @returns Formatted UUID with dashes
 */
export function formatUUID(uuid: string): string {
  const clean = uuid.replace(/-/g, '');
  return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
}

/**
 * Check if username format is valid (before making API call)
 * @param username - Username to check
 * @returns true if format is valid
 */
export function isValidUsernameFormat(username: string): boolean {
  // Minecraft usernames: 3-16 characters, alphanumeric + underscore
  const regex = /^[a-zA-Z0-9_]{3,16}$/;
  return regex.test(username);
}

/**
 * Batch fetch multiple usernames' UUIDs (max 10 at a time per Mojang API limits)
 * @param usernames - Array of usernames to look up
 * @returns Array of profiles found
 */
export async function batchFetchUUIDs(usernames: string[]): Promise<MinecraftProfile[]> {
  try {
    // Mojang API allows max 10 usernames per request
    const batch = usernames.slice(0, 10);
    
    const response = await fetch(
      'https://api.mojang.com/profiles/minecraft',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      }
    );

    if (!response.ok) {
      throw new Error(`Mojang API error: ${response.status}`);
    }

    const data = await response.json();
    return data.map((profile: any) => ({
      id: profile.id,
      name: profile.name,
    }));
  } catch (error: any) {
    console.error('Error batch fetching UUIDs:', error);
    return [];
  }
}

