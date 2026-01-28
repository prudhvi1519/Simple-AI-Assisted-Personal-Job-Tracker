import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireServerEnv, ENV_KEYS } from "@/lib/utils/env";
import { Job } from "@/lib/supabase/client";

// Force dynamic - needs env vars at runtime
export const dynamic = "force-dynamic";

// Validate env at module load - REMOVED
// try {
//     requireServerEnv(ENV_KEYS.SUPABASE);
// } catch {
//     // Will be caught per-request
// }

// Helper to escape CSV fields
function escapeCsvField(field: unknown): string {
    if (field === null || field === undefined) return "";
    const stringValue = String(field);
    // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (/[",\n\r]/.test(stringValue)) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
}

export async function GET() {
    try {
        requireServerEnv(ENV_KEYS.SUPABASE);
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

        const jobList = (jobs as Job[]) || [];

        // Define columns
        const columns = [
            "id",
            "title",
            "company_name",
            "status",
            "priority",
            "work_mode",
            "location",
            "req_id",
            "job_post_url",
            "apply_url",
            "recruiter_name",
            "recruiter_emails",
            "primary_skills",
            "secondary_skills",
            "compensation_text",
            "next_followup_at",
            "notes",
            "created_at",
            "updated_at",
            "source",
        ];

        // Build CSV content
        let csv = columns.join(",") + "\n";

        for (const job of jobList) {
            const row = columns.map((col) => {
                const val = job[col as keyof Job];

                // Handle arrays (emails, skills)
                if (Array.isArray(val)) {
                    return escapeCsvField(val.join(", "));
                }

                return escapeCsvField(val);
            });
            csv += row.join(",") + "\n";
        }

        // Return CSV file download
        return new NextResponse(csv, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="jobs_export_${new Date().toISOString().split("T")[0]}.csv"`,
            },
        });
    } catch (err) {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
