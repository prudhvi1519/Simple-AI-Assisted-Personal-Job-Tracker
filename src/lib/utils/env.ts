/**
 * Environment variable validation utilities
 * 
 * IMPORTANT: Never log or expose actual env values in errors
 */

/**
 * Required environment variables for different features
 */
export const ENV_KEYS = {
    SUPABASE: [
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ],
    GEMINI: [
        "GEMINI_API_KEY",
    ],
    ALL: [
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "GEMINI_API_KEY",
    ],
} as const;

/**
 * Check if required server-side environment variables are present.
 * Throws an error with missing key names (never values) if any are missing.
 * 
 * @param keys - Array of environment variable keys to check
 * @throws Error with list of missing keys
 */
export function requireServerEnv(keys: readonly string[]): void {
    const missing: string[] = [];

    for (const key of keys) {
        const value = process.env[key];
        if (!value || value.trim() === "") {
            missing.push(key);
        }
    }

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missing.join(", ")}. ` +
            `Set them in .env.local (local) or Netlify env vars (prod).`
        );
    }
}

/**
 * Check environment variables and return status object.
 * Never includes actual values.
 */
export function checkEnvHealth(): {
    ok: boolean;
    missing: string[];
    present: string[];
} {
    const allKeys = ENV_KEYS.ALL;
    const missing: string[] = [];
    const present: string[] = [];

    for (const key of allKeys) {
        const value = process.env[key];
        if (!value || value.trim() === "") {
            missing.push(key);
        } else {
            present.push(key);
        }
    }

    return {
        ok: missing.length === 0,
        missing,
        present,
    };
}
