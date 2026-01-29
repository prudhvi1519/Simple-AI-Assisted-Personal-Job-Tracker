import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/adminClient";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export const dynamic = "force-dynamic";

interface LoginRequest {
    username?: string;
    password?: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: LoginRequest = await request.json();
        const { username, password } = body;

        if (!username || !password) {
            return NextResponse.json(
                { ok: false, error: "Username and password are required" },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();

        // 1. Try to find user in DB
        const { data: users, error: fetchError } = await supabase
            .from("admin_users")
            .select("id, username, password_hash")
            .eq("username", username)
            .limit(1);

        if (fetchError) {
            console.error("Login DB error:", fetchError);
            return NextResponse.json(
                { ok: false, error: "Internal authentication error" },
                { status: 500 }
            );
        }

        const user = users?.[0];

        if (user) {
            // 2. User exists: Verify password hash
            const isValid = await verifyPassword(password, user.password_hash);
            if (!isValid) {
                return NextResponse.json(
                    { ok: false, error: "Invalid credentials" },
                    { status: 401 }
                );
            }
            // Success: proceed to session
        } else {
            // 3. User NOT in DB: Check Env Fallback (Bootstrap)
            const envUser = process.env.ADMIN_USERNAME;
            const envPass = process.env.ADMIN_PASSWORD;

            if (envUser && envPass && username === envUser && password === envPass) {
                // Env matches! Bootstrap this user into DB
                const hashedPassword = await hashPassword(envPass);

                // Idempotent Insert (on conflict do nothing)
                // Note: We use ignoring duplicates to handle race conditions
                const { error: insertError } = await supabase
                    .from("admin_users")
                    .insert({
                        username: username,
                        password_hash: hashedPassword
                    });

                if (insertError) {
                    // Start log but proceed with login anyway since env credentials are valid
                    console.error("Bootstrap insert failed (likely race condition):", insertError);
                }

                // Success: proceed to session
            } else {
                // Neither DB nor Env matched
                return NextResponse.json(
                    { ok: false, error: "Invalid credentials" },
                    { status: 401 }
                );
            }
        }

        // 4. Create session token (cookie)
        const token = createSessionToken(username);
        await setSessionCookie(token);

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("Login error:", err);
        return NextResponse.json(
            { ok: false, error: `Login failed: ${err instanceof Error ? err.message : String(err)}` },
            { status: 500 }
        );
    }
}
