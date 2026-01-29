/**
 * API Route Auth Guard
 * Use this to protect API routes that require admin authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "./session";

/**
 * Check if request is authenticated
 * Returns the username if authenticated, null otherwise
 */
export function isAuthenticated(request: NextRequest): string | null {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const result = verifySessionToken(token);
    return result.ok ? result.user : null;
}

/**
 * Create an unauthorized response
 */
export function unauthorizedResponse(): NextResponse {
    return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
    );
}

/**
 * Higher-order function to wrap API handlers with auth check
 * Usage: export const GET = withAuth(async (request, user) => { ... })
 */
export function withAuth<T extends NextRequest>(
    handler: (request: T, user: string) => Promise<NextResponse>
) {
    return async (request: T): Promise<NextResponse> => {
        const user = isAuthenticated(request);
        if (!user) {
            return unauthorizedResponse();
        }
        return handler(request, user);
    };
}

/**
 * Simple guard function - call at start of handler
 * Returns NextResponse if unauthorized, null if OK
 * Usage:
 *   const authError = requireAdmin(request);
 *   if (authError) return authError;
 */
export function requireAdmin(request: NextRequest): NextResponse | null {
    const user = isAuthenticated(request);
    if (!user) {
        return unauthorizedResponse();
    }
    return null;
}
