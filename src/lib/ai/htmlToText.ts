/**
 * Strip HTML tags and normalize whitespace to get plain text
 */
export function htmlToText(html: string): string {
    // Remove script and style elements entirely
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

    // Remove HTML comments
    text = text.replace(/<!--[\s\S]*?-->/g, "");

    // Replace common block elements with newlines
    text = text.replace(/<\/?(div|p|br|hr|h[1-6]|li|tr|td|th|section|article|header|footer|nav)[^>]*>/gi, "\n");

    // Remove all remaining HTML tags
    text = text.replace(/<[^>]+>/g, " ");

    // Decode common HTML entities
    text = text.replace(/&nbsp;/g, " ");
    text = text.replace(/&amp;/g, "&");
    text = text.replace(/&lt;/g, "<");
    text = text.replace(/&gt;/g, ">");
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    text = text.replace(/&apos;/g, "'");

    // Normalize whitespace
    text = text.replace(/\s+/g, " ");
    text = text.replace(/\n\s+/g, "\n");
    text = text.replace(/\s+\n/g, "\n");
    text = text.replace(/\n{3,}/g, "\n\n");

    return text.trim();
}

/**
 * Fetch a URL and return its text content
 * Returns null on failure
 */
export async function fetchUrlAsText(
    url: string,
    timeoutMs: number = 10000,
    maxChars: number = 50000
): Promise<{ text: string | null; error: string | null }> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            return {
                text: null,
                error: `HTTP ${response.status}: ${response.statusText}`,
            };
        }

        const html = await response.text();
        const plainText = htmlToText(html);

        // Limit text length
        const truncatedText = plainText.slice(0, maxChars);

        return { text: truncatedText, error: null };
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        return { text: null, error: errorMessage };
    }
}
