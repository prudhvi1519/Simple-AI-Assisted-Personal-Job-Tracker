import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    // Auth guard
    const authError = requireAdmin(request);
    if (authError) return authError;

    try {
        const supabase = getServerSupabase();

        // 1. Fetch all jobs
        const { data: jobs, error: jobsError } = await supabase
            .from("jobs")
            .select("*")
            .order("created_at", { ascending: false });

        if (jobsError) throw jobsError;

        // 2. Fetch all files
        const { data: files, error: filesError } = await supabase
            .from("job_files")
            .select("*")
            .order("created_at", { ascending: true });

        if (filesError) throw filesError;

        // 3. Group files by job
        const jobsWithFiles = jobs.map((job) => {
            const jobFiles = files.filter((f) => f.job_id === job.id);
            return {
                job,
                files: jobFiles,
            };
        });

        // 4. Construct response
        const manifest = {
            generatedAt: new Date().toISOString(),
            jobs: jobsWithFiles,
        };

        return NextResponse.json(manifest);
    } catch (error) {
        console.error("Export error:", error);
        return NextResponse.json(
            { error: "Failed to generate manifest" },
            { status: 500 }
        );
    }
}
