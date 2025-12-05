import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date to a human-readable string
 */
export function formatDate(date: Date | string | number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

/**
 * Format a date to a relative time string (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string | number): string {
  const now = new Date();
  const then = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  return formatDate(date);
}

/**
 * Format a number with commas
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Generate a random string
 */
export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Slugify a string
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Check if a value is empty
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get initials from a name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate Minecraft username format
 */
export function isValidMinecraftUsername(username: string): boolean {
  const mcUsernameRegex = /^[a-zA-Z0-9_]{3,16}$/;
  return mcUsernameRegex.test(username);
}

/**
 * Get Minecraft avatar URL using minotar.net
 * @param username - Minecraft username
 * @param size - Avatar size (default 100)
 * @param style - Avatar style: defaults to armor bust for richer presentation
 */
export function getMinecraftAvatarUrl(
  username: string,
  size = 100,
  style: 'armor-bust' | 'cube' | 'avatar' | 'helm' = 'armor-bust'
): string {
  const stylePath = style === 'armor-bust' ? 'armor/bust' : style;
  // Minotar.net provides Minecraft avatars by username
  return `https://minotar.net/${stylePath}/${username}/${size}.png`;
}

/**
 * Get user's avatar with custom avatar support
 * @param username - Minecraft username
 * @param customAvatar - Optional custom avatar URL
 * @param size - Avatar size
 */
export function getUserAvatarUrl(
  username: string,
  customAvatar?: string | null,
  size = 100
): string {
  // If user has custom avatar, use that
  if (customAvatar) {
    return customAvatar;
  }
  // Otherwise use Minecraft avatar from minotar
  return getMinecraftAvatarUrl(username, size, 'armor-bust');
}

/**
 * Get Minecraft head render URL (legacy support)
 */
export function getMinecraftHeadUrl(username: string, size = 100): string {
  return getMinecraftAvatarUrl(username, size, 'avatar');
}

/**
 * Get Minecraft armor bust render from Minotaur API
 * @param username - Minecraft username
 * @returns URL to the bust image
 */
export function getMinotaurBustUrl(username: string): string {
  return `https://minotar.net/armor/bust/${encodeURIComponent(username)}/100.png`;
}

/**
 * Format playtime from seconds to human readable string
 * @param seconds - Total playtime in seconds
 * @returns Formatted playtime string (e.g., "2h 30m", "5d 3h")
 */
export function formatPlaytime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours < 24) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}
