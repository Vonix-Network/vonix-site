/**
 * Input Sanitization Utilities
 * Provides comprehensive sanitization for user inputs to prevent XSS, SQL injection, and other attacks
 */

/**
 * HTML entities to escape
 */
const HTML_ENTITIES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
};

/**
 * Escape HTML special characters to prevent XSS attacks
 * @param input - String to escape
 * @returns Escaped string safe for HTML display
 */
export function escapeHtml(input: string): string {
    if (!input || typeof input !== 'string') return '';
    return input.replace(/[&<>"'`=/]/g, char => HTML_ENTITIES[char] || char);
}

/**
 * Sanitize a text input by trimming, removing null bytes, and normalizing whitespace
 * Does NOT escape HTML - use escapeHtml for display purposes
 * @param input - String to sanitize
 * @param options - Sanitization options
 * @returns Sanitized string
 */
export function sanitizeText(
    input: string | null | undefined,
    options: {
        maxLength?: number;
        allowNewlines?: boolean;
        trim?: boolean;
    } = {}
): string {
    if (!input || typeof input !== 'string') return '';

    const { maxLength, allowNewlines = false, trim = true } = options;

    let result = input;

    // Remove null bytes and other control characters (except newlines/tabs if allowed)
    if (allowNewlines) {
        result = result.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    } else {
        result = result.replace(/[\x00-\x1F\x7F]/g, ' ');
    }

    // Normalize whitespace
    if (!allowNewlines) {
        result = result.replace(/\s+/g, ' ');
    } else {
        // Normalize spaces but preserve newlines
        result = result.replace(/[^\S\n]+/g, ' ');
        // Limit consecutive newlines to 2
        result = result.replace(/\n{3,}/g, '\n\n');
    }

    // Trim if requested
    if (trim) {
        result = result.trim();
    }

    // Enforce max length
    if (maxLength && result.length > maxLength) {
        result = result.slice(0, maxLength);
    }

    return result;
}

/**
 * Sanitize text specifically for database storage (stores unescaped but cleaned text)
 * Use this for all user inputs before storing in database
 * @param input - String to sanitize
 * @param maxLength - Maximum allowed length
 * @param allowNewlines - Whether to allow newlines (for content fields)
 * @returns Sanitized string safe for database storage
 */
export function sanitizeForDb(
    input: string | null | undefined,
    maxLength = 10000,
    allowNewlines = false
): string {
    return sanitizeText(input, { maxLength, allowNewlines, trim: true });
}

/**
 * Sanitize a username input
 * @param input - Username to sanitize
 * @returns Sanitized username
 */
export function sanitizeUsername(input: string | null | undefined): string {
    if (!input || typeof input !== 'string') return '';

    // Remove all characters except alphanumeric and underscore
    let result = input.replace(/[^a-zA-Z0-9_]/g, '');

    // Enforce length limits
    result = result.slice(0, 32);

    return result;
}

/**
 * Sanitize an email input
 * @param input - Email to sanitize
 * @returns Sanitized email
 */
export function sanitizeEmail(input: string | null | undefined): string {
    if (!input || typeof input !== 'string') return '';

    let result = input.toLowerCase().trim();

    // Remove any characters that aren't valid in emails
    result = result.replace(/[^a-z0-9._%+\-@]/g, '');

    // Enforce length limits
    result = result.slice(0, 255);

    return result;
}

/**
 * Sanitize a URL input
 * @param input - URL to sanitize
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(input: string | null | undefined): string {
    if (!input || typeof input !== 'string') return '';

    const trimmed = input.trim();

    // Only allow http/https URLs
    try {
        const url = new URL(trimmed);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return '';
        }
        return url.toString();
    } catch {
        return '';
    }
}

/**
 * Sanitize an integer input
 * @param input - Number to sanitize
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Sanitized integer
 */
export function sanitizeInt(
    input: string | number | null | undefined,
    min = Number.MIN_SAFE_INTEGER,
    max = Number.MAX_SAFE_INTEGER
): number | null {
    if (input === null || input === undefined || input === '') return null;

    const parsed = typeof input === 'string' ? parseInt(input, 10) : input;

    if (isNaN(parsed) || !isFinite(parsed)) return null;

    return Math.max(min, Math.min(max, Math.floor(parsed)));
}

/**
 * Sanitize an enum value
 * @param input - Value to sanitize
 * @param allowedValues - Array of allowed values
 * @param defaultValue - Default value if input is invalid
 * @returns Sanitized enum value
 */
export function sanitizeEnum<T extends string>(
    input: string | null | undefined,
    allowedValues: readonly T[],
    defaultValue: T
): T {
    if (!input || typeof input !== 'string') return defaultValue;

    const trimmed = input.trim() as T;

    if (allowedValues.includes(trimmed)) {
        return trimmed;
    }

    return defaultValue;
}

/**
 * Sanitize a search query
 * @param input - Search query to sanitize
 * @returns Sanitized search query
 */
export function sanitizeSearchQuery(input: string | null | undefined): string {
    if (!input || typeof input !== 'string') return '';

    let result = input.trim();

    // Remove SQL wildcards and special characters
    result = result.replace(/[%_\\]/g, '');

    // Remove excessive whitespace
    result = result.replace(/\s+/g, ' ');

    // Limit length
    result = result.slice(0, 100);

    return result;
}

/**
 * Strip all HTML tags from a string
 * @param input - String with HTML
 * @returns Plain text without HTML tags
 */
export function stripHtmlTags(input: string | null | undefined): string {
    if (!input || typeof input !== 'string') return '';

    return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove styles
        .replace(/<[^>]+>/g, '') // Remove all other tags
        .replace(/&nbsp;/g, ' ') // Replace nbsp with space
        .trim();
}

/**
 * Validate and sanitize JSON string
 * @param input - JSON string to validate
 * @returns Parsed JSON or null if invalid
 */
export function sanitizeJson<T = unknown>(input: string | null | undefined): T | null {
    if (!input || typeof input !== 'string') return null;

    try {
        return JSON.parse(input) as T;
    } catch {
        return null;
    }
}

/**
 * Sanitize an array of strings
 * @param input - Array to sanitize
 * @param itemMaxLength - Max length for each item
 * @param maxItems - Max number of items
 * @returns Sanitized array
 */
export function sanitizeStringArray(
    input: unknown,
    itemMaxLength = 100,
    maxItems = 100
): string[] {
    if (!Array.isArray(input)) return [];

    return input
        .filter((item): item is string => typeof item === 'string')
        .slice(0, maxItems)
        .map((item: any) => sanitizeForDb(item, itemMaxLength));
}

/**
 * Check if a string contains potentially malicious content
 * @param input - String to check
 * @returns true if potentially malicious content detected
 */
export function containsMaliciousContent(input: string | null | undefined): boolean {
    if (!input || typeof input !== 'string') return false;

    const maliciousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i, // onclick, onerror, etc.
        /data:/i,
        /vbscript:/i,
        /<iframe/i,
        /<object/i,
        /<embed/i,
        /<link/i,
        /<meta/i,
        /expression\s*\(/i, // CSS expression
        /url\s*\(/i, // CSS url (can be dangerous in some contexts)
    ];

    return maliciousPatterns.some((pattern: any) => pattern.test(input));
}

/**
 * Comprehensive sanitization for user-generated content (posts, comments, etc.)
 * Allows markdown but removes dangerous HTML
 * @param input - Content to sanitize
 * @param maxLength - Maximum content length
 * @returns Sanitized content
 */
export function sanitizeContent(
    input: string | null | undefined,
    maxLength = 10000
): string {
    if (!input || typeof input !== 'string') return '';

    let result = input;

    // Remove script tags and their content
    result = result.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove style tags and their content
    result = result.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Remove dangerous tags but keep content
    result = result.replace(/<\/?(?:iframe|object|embed|link|meta|form|input|button)[^>]*>/gi, '');

    // Remove event handlers
    result = result.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    result = result.replace(/\s*on\w+\s*=\s*[^\s>]+/gi, '');

    // Remove javascript: and data: URLs
    result = result.replace(/(?:javascript|data|vbscript):/gi, '');

    // Apply basic text sanitization
    result = sanitizeText(result, { maxLength, allowNewlines: true, trim: true });

    return result;
}
