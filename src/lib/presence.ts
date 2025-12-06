// Presence timeout in milliseconds - user is considered offline after this period
export const PRESENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

/**
 * Helper function to check if a user is online based on lastSeenAt
 */
export function isUserOnline(lastSeenAt: Date | null | undefined): boolean {
    if (!lastSeenAt) return false;
    const lastSeen = new Date(lastSeenAt).getTime();
    return (Date.now() - lastSeen) < PRESENCE_TIMEOUT;
}

