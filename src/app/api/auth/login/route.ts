import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

interface LoginRequest {
    username?: string;
    password?: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: LoginRequest = await request.json();
        const { username, password } = body;

        // Get expected credentials from env
        const expectedUsername = process.env.ADMIN_USERNAME;
        const expectedPassword = process.env.ADMIN_PASSWORD;

        if (!expectedUsername || !expectedPassword) {
            console.error("ADMIN_USERNAME or ADMIN_PASSWORD not configured");
            return NextResponse.json(
                { ok: false, error: "Server configuration error" },
                { status: 500 }
            );
        }

        // Validate input
        if (!username || !password) {
            return NextResponse.json(
                { ok: false, error: "Username and password are required" },
                { status: 400 }
            );
        }

        // Check credentials (constant-time comparison would be ideal but for admin-only this is acceptable)
        if (username !== expectedUsername || password !== expectedPassword) {
            return NextResponse.json(
                { ok: false, error: "Invalid credentials" },
                { status: 401 }
            );
        }

        // Create session token and set cookie
        const token = createSessionToken(username);
        await setSessionCookie(token);

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("Login error:", err);
        return NextResponse.json(
            { ok: false, error: "Login failed" },
            { status: 500 }
        );
    }
}
