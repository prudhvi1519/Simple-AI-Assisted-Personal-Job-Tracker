import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireServerEnv, ENV_KEYS } from "@/lib/utils/env";

// Force dynamic - needs env vars at runtime
export const dynamic = "force-dynamic";

// Validate env at module load
try {
    requireServerEnv(ENV_KEYS.SUPABASE);
} catch {
    // Will be caught per-request
}

export async function GET() {
    try {
        const supabase = getServerSupabase();

        const { data: jobs, error } = await supabase
            .from("jobs")
            .select("*")
            .order("updated_at", { ascending: false });

        if (error) {
            return NextResponse.json(
                { error: "Failed to fetch jobs", details: error.message },
                { status: 500 }
            );
        }

        // Return JSON file download
        return new NextResponse(JSON.stringify(jobs, null, 2), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="jobs_export_${new Date().toISOString().split("T")[0]}.json"`,
            },
        });
    } catch (err) {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
