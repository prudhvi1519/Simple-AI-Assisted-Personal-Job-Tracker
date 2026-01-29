import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";

const COOKIE_NAME = "sjta_session";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/", "/login"];
const PUBLIC_API_PREFIXES = ["/api/auth", "/api/health"];
const STATIC_PREFIXES = ["/_next", "/brand", "/favicon"];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow static assets
    if (STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
        return NextResponse.next();
    }

    // Allow public API routes
    if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
        return NextResponse.next();
    }

    // Check authentication
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = verifySessionToken(token);
    const isAuthenticated = session.ok;

    // Public routes
    if (PUBLIC_ROUTES.includes(pathname)) {
        // If authenticated and on login page, redirect to /jobs
        if (isAuthenticated && pathname === "/login") {
            return NextResponse.redirect(new URL("/jobs", request.url));
        }
        // If authenticated and on landing page, redirect to /jobs (optional but recommended)
        if (isAuthenticated && pathname === "/") {
            return NextResponse.redirect(new URL("/jobs", request.url));
        }
        return NextResponse.next();
    }

    // Protected routes - require authentication
    if (!isAuthenticated) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        "/((?!_next/static|_next/image|favicon.ico|brand/).*)",
    ],
};
