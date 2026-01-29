import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/adminClient";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { verifySessionToken, createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

interface ChangePasswordRequest {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
}

export async function POST(request: NextRequest) {
    try {
        // 1. Verify Authentication (Session)
        const cookieStore = await cookies();
        const token = cookieStore.get("sjta_session")?.value;
        const session = await verifySessionToken(token);

        if (!session.ok) {
            return NextResponse.json(
                { ok: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const username = session.user;

        // 2. Parse Request
        const body: ChangePasswordRequest = await request.json();
        const { currentPassword, newPassword, confirmPassword } = body;

        // 3. Validate Inputs
        if (!currentPassword || !newPassword || !confirmPassword) {
            return NextResponse.json(
                { ok: false, error: "All fields are required" },
                { status: 400 }
            );
        }

        if (newPassword.length < 8) {
            return NextResponse.json(
                { ok: false, error: "New password must be at least 8 characters" },
                { status: 400 }
            );
        }

        if (newPassword !== confirmPassword) {
            return NextResponse.json(
                { ok: false, error: "New passwords do not match" },
                { status: 400 }
            );
        }

        // 4. Get User from DB (DB-first check mandatory for password change)
        const supabase = createAdminClient();
        const { data: users, error: fetchError } = await supabase
            .from("admin_users")
            .select("id, password_hash")
            .eq("username", username)
            .limit(1);

        if (fetchError || !users || users.length === 0) {
            console.error("Change Password DB error or user not found:", fetchError);
            return NextResponse.json(
                { ok: false, error: "User record not found in database. Please re-login." },
                { status: 404 }
            );
        }

        const user = users[0];

        // 5. Verify Current Password
        const isCurrentValid = await verifyPassword(currentPassword, user.password_hash);
        if (!isCurrentValid) {
            return NextResponse.json(
                { ok: false, error: "Incorrect current password" },
                { status: 401 }
            );
        }

        // 6. Hash New Password
        const newHash = await hashPassword(newPassword);

        // 7. Update DB
        const { error: updateError } = await supabase
            .from("admin_users")
            .update({ password_hash: newHash })
            .eq("id", user.id);

        if (updateError) {
            console.error("Password update error:", updateError);
            return NextResponse.json(
                { ok: false, error: "Failed to update password" },
                { status: 500 }
            );
        }

        // 8. Rotate Session Cookie (Re-issue 24h)
        const newToken = createSessionToken(username);
        await setSessionCookie(newToken);

        return NextResponse.json({ ok: true });

    } catch (err) {
        console.error("Change password error:", err);
        return NextResponse.json(
            { ok: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
