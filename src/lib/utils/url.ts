/**
 * Validate if a string is a valid URL
 */
export function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Extract domain from a URL
 */
export function extractDomain(url: string): string | null {
    try {
        const parsed = new URL(url);
        return parsed.hostname.replace("www.", "");
    } catch {
        return null;
    }
}

/**
 * Ensure URL has protocol, add https:// if missing
 */
export function ensureProtocol(url: string): string {
    if (!url) return url;
    if (url.startsWith("http://") || url.startsWith("https://")) {
        return url;
    }
    return `https://${url}`;
}
