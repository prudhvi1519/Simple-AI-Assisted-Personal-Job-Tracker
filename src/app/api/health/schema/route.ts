import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const supabase = getServerSupabase();

        // Check for existence of new columns by selecting them from a single row
        // We use limit(0) to avoid fetching data, just checking schema validity
        const { error } = await supabase
            .from("jobs")
            .select("primary_skills, secondary_skills, work_mode, priority, next_followup_at, location, compensation_text, recruiter_name, source")
            .limit(1);

        if (error) {
            console.error("Schema health check failed:", error);
            return NextResponse.json(
                {
                    ok: false,
                    error: "Schema mismatch",
                    details: error.message,
                    hint: "Has the migration '20260128170000_jobs_fields_upgrade.sql' been applied?"
                },
                { status: 500 }
            );
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("Schema health check error:", err);
        return NextResponse.json(
            { ok: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
