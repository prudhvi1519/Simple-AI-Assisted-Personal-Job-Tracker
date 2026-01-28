import { NextResponse } from "next/server";
import { checkEnvHealth } from "@/lib/utils/env";

// Force dynamic - needs env vars at runtime
export const dynamic = "force-dynamic";

/**
 * GET /api/health/env - Check environment variable health
 * Returns which required vars are present/missing (never values)
 */
export async function GET() {
    const health = checkEnvHealth();

    return NextResponse.json(health, {
        status: health.ok ? 200 : 503,
    });
}
