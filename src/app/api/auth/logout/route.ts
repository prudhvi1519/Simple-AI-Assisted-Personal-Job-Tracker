import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST() {
    try {
        await clearSessionCookie();
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("Logout error:", err);
        return NextResponse.json(
            { ok: false, error: "Logout failed" },
            { status: 500 }
        );
    }
}
