/**
 * Error Reporting Utility
 * Reports errors to admin via email when configured
 */

import { sendAdminErrorAlert } from '@/lib/email';

/**
 * Report an error to admins
 * Call this in catch blocks for critical errors you want to be notified about
 */
export async function reportError(
    errorType: string,
    error: Error | string,
    requestInfo?: {
        url?: string;
        method?: string;
        userAgent?: string;
        ip?: string;
    }
): Promise<void> {
    try {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        // Log to console regardless
        console.error(`[Error Report] ${errorType}:`, errorMessage);
        if (errorStack) {
            console.error(errorStack);
        }

        // Send email alert (async, won't block)
        await sendAdminErrorAlert(errorType, errorMessage, errorStack, requestInfo);
    } catch (reportingError) {
        // Don't let error reporting cause additional issues
        console.error('Failed to report error:', reportingError);
    }
}

/**
 * Create a request info object from a NextRequest
 */
export function getRequestInfo(request: Request): {
    url: string;
    method: string;
    userAgent?: string;
    ip?: string;
} {
    return {
        url: request.url,
        method: request.method,
        userAgent: request.headers.get('user-agent') || undefined,
        ip: request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            undefined,
    };
}
