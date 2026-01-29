import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const session = await getSession();

        if (session.ok) {
            return NextResponse.json({ ok: true, user: session.user });
        } else {
            return NextResponse.json({ ok: false }, { status: 401 });
        }
    } catch (err) {
        console.error("Auth check error:", err);
        return NextResponse.json(
            { ok: false, error: "Auth check failed" },
            { status: 500 }
        );
    }
}
