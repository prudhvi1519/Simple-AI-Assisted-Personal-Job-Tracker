/**
 * Auth Session Helper
 * Uses HMAC SHA-256 signed cookies with 24h expiry
 */

import { createHmac } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "sjta_session";
const TTL_SECONDS = 86400; // 24 hours

interface SessionPayload {
    u: string; // username
    exp: number; // expiry timestamp
}

function getAuthSecret(): string {
    const secret = process.env.AUTH_SECRET;
    if (!secret || secret.length < 16) {
        throw new Error("AUTH_SECRET must be set and at least 16 characters");
    }
    return secret;
}

function base64UrlEncode(data: string): string {
    return Buffer.from(data, "utf-8")
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

function base64UrlDecode(data: string): string {
    const padded = data + "=".repeat((4 - (data.length % 4)) % 4);
    return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

function sign(payload: string, secret: string): string {
    return createHmac("sha256", secret).update(payload).digest("base64url");
}

/**
 * Create a signed session token
 */
export function createSessionToken(username: string): string {
    const secret = getAuthSecret();
    const payload: SessionPayload = {
        u: username,
        exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
    };
    const payloadStr = JSON.stringify(payload);
    const encodedPayload = base64UrlEncode(payloadStr);
    const signature = sign(encodedPayload, secret);
    return `${encodedPayload}.${signature}`;
}

/**
 * Verify a session token
 */
export function verifySessionToken(token?: string): { ok: true; user: string } | { ok: false } {
    if (!token) return { ok: false };

    try {
        const secret = getAuthSecret();
        const [encodedPayload, signature] = token.split(".");
        if (!encodedPayload || !signature) return { ok: false };

        // Verify signature
        const expectedSignature = sign(encodedPayload, secret);
        if (signature !== expectedSignature) return { ok: false };

        // Decode and check expiry
        const payloadStr = base64UrlDecode(encodedPayload);
        const payload: SessionPayload = JSON.parse(payloadStr);

        if (!payload.u || !payload.exp) return { ok: false };
        if (payload.exp < Math.floor(Date.now() / 1000)) return { ok: false };

        return { ok: true, user: payload.u };
    } catch {
        return { ok: false };
    }
}

/**
 * Get session from cookie (for server components/API routes)
 */
export async function getSession(): Promise<{ ok: true; user: string } | { ok: false }> {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    return verifySessionToken(token);
}

/**
 * Set session cookie
 */
export async function setSessionCookie(token: string): Promise<void> {
    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === "production";

    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction,
        path: "/",
        maxAge: TTL_SECONDS,
    });
}

/**
 * Clear session cookie
 */
export async function clearSessionCookie(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
}

// Export cookie name and TTL for use in other modules
export { COOKIE_NAME, TTL_SECONDS };
