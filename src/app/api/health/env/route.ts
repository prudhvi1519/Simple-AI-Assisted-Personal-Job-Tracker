import { NextResponse } from "next/server";
import { ENV_KEYS } from "@/lib/utils/env";

// Force dynamic - needs env vars at runtime
export const dynamic = "force-dynamic";

/**
 * GET /api/health/env - Check environment variable health
 * Returns which required vars are present/missing (never values)
 */
export async function GET() {
    const requiredKeys = [
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "GEMINI_API_KEY",
        "ADMIN_USERNAME",
        "ADMIN_PASSWORD",
        "AUTH_SECRET",
        "SUPABASE_SERVICE_ROLE_KEY"
    ];

    const missing = requiredKeys.filter((key) => !process.env[key]);

    return NextResponse.json({
        ok: missing.length === 0,
        missing: missing,
        checked: requiredKeys,
        timestamp: new Date().toISOString()
    }, {
        status: missing.length === 0 ? 200 : 503,
    });
}
