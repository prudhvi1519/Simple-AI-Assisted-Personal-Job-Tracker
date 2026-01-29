import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireServerEnv, ENV_KEYS } from "@/lib/utils/env";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import {
    Job,
    JobFile,
    JobDetailResponse,
    UpdateJobRequest,
    AiRun,
    JOB_STATUSES,
    WORK_MODES,
    PRIORITIES,
    isValidJobStatus,
    isValidWorkMode,
    isValidPriority,
    isValidUrl,
} from "@/lib/supabase/client";

// Force dynamic - needs env vars at runtime
export const dynamic = "force-dynamic";

// Validate env at module load
// validate env at module load - REMOVED due to timing issues
// try {
//     requireServerEnv(ENV_KEYS.SUPABASE);
// } catch {
//     // Will be caught per-request
// }

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/jobs/[id] - Get job details with files and latest AI run
export async function GET(request: NextRequest, { params }: RouteParams) {
    // Auth guard
    const authError = requireAdmin(request);
    if (authError) return authError;

    try {
        const { id } = await params;
        const supabase = getServerSupabase();

        // Fetch job
        const { data: job, error: jobError } = await supabase
            .from("jobs")
            .select("*")
            .eq("id", id)
            .single();

        if (jobError) {
            if (jobError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Job not found" },
                    { status: 404 }
                );
            }
            console.error("Error fetching job:", jobError);
            return NextResponse.json(
                { error: "Failed to fetch job", details: jobError.message },
                { status: 500 }
            );
        }

        // Fetch all files for the job
        const { data: files } = await supabase
            .from("job_files")
            .select("*")
            .eq("job_id", id)
            .order("created_at", { ascending: false });

        const jobFiles = (files || []) as JobFile[];

        // Calculate file counts from files array
        const fileCounts = {
            resume: jobFiles.filter((f) => f.file_type === "resume").length,
            document: jobFiles.filter((f) => f.file_type === "document").length,
        };

        // Fetch latest AI run
        const { data: aiRuns } = await supabase
            .from("ai_runs")
            .select("*")
            .eq("job_id", id)
            .order("created_at", { ascending: false })
            .limit(1);

        const response: JobDetailResponse = {
            ...(job as Job),
            file_counts: fileCounts,
            files: jobFiles,
            latest_ai_run: (aiRuns && aiRuns.length > 0 ? aiRuns[0] : null) as AiRun | null,
        };

        return NextResponse.json(response);
    } catch (err) {
        console.error("Unexpected error in GET /api/jobs/[id]:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// PUT /api/jobs/[id] - Update job (partial update allowed)
export async function PUT(request: NextRequest, { params }: RouteParams) {
    // Auth guard
    const authError = requireAdmin(request);
    if (authError) return authError;

    try {
        requireServerEnv(ENV_KEYS.SUPABASE);
        const { id } = await params;
        const supabase = getServerSupabase();

        // Parse request body
        let body: UpdateJobRequest;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Invalid JSON body" },
                { status: 400 }
            );
        }

        // Check if job exists
        const { data: existing, error: existError } = await supabase
            .from("jobs")
            .select("id")
            .eq("id", id)
            .single();

        if (existError || !existing) {
            return NextResponse.json(
                { error: "Job not found" },
                { status: 404 }
            );
        }

        // Validate status if provided
        if (body.status !== undefined && !isValidJobStatus(body.status)) {
            return NextResponse.json(
                {
                    error: "Invalid status",
                    details: `Status must be one of: ${JOB_STATUSES.join(", ")}`,
                },
                { status: 400 }
            );
        }

        // Validate URLs if provided
        if (body.job_post_url && !isValidUrl(body.job_post_url)) {
            return NextResponse.json(
                { error: "Invalid job_post_url", details: "Must be a valid URL" },
                { status: 400 }
            );
        }
        if (body.apply_url && !isValidUrl(body.apply_url)) {
            return NextResponse.json(
                { error: "Invalid apply_url", details: "Must be a valid URL" },
                { status: 400 }
            );
        }

        // Validate work_mode if provided
        if (body.work_mode !== undefined && body.work_mode !== null && !isValidWorkMode(body.work_mode)) {
            return NextResponse.json(
                {
                    error: "Invalid work_mode",
                    details: `Work mode must be one of: ${WORK_MODES.join(", ")}`,
                },
                { status: 400 }
            );
        }

        // Validate priority if provided
        if (body.priority !== undefined && body.priority !== null && !isValidPriority(body.priority)) {
            return NextResponse.json(
                {
                    error: "Invalid priority",
                    details: `Priority must be one of: ${PRIORITIES.join(", ")}`,
                },
                { status: 400 }
            );
        }

        // Build update data (only include fields that were provided)
        const updateData: Record<string, unknown> = {};
        if (body.title !== undefined) updateData.title = body.title || null;
        if (body.company_name !== undefined) updateData.company_name = body.company_name || null;
        if (body.req_id !== undefined) updateData.req_id = body.req_id || null;
        if (body.job_post_url !== undefined) updateData.job_post_url = body.job_post_url || null;
        if (body.apply_url !== undefined) updateData.apply_url = body.apply_url || null;
        if (body.recruiter_emails !== undefined) updateData.recruiter_emails = body.recruiter_emails;
        if (body.recruiter_name !== undefined) updateData.recruiter_name = body.recruiter_name || null;
        if (body.primary_skills !== undefined) updateData.primary_skills = body.primary_skills || [];
        if (body.secondary_skills !== undefined) updateData.secondary_skills = body.secondary_skills || [];
        if (body.location !== undefined) updateData.location = body.location || null;
        if (body.work_mode !== undefined) updateData.work_mode = body.work_mode || null;
        if (body.compensation_text !== undefined) updateData.compensation_text = body.compensation_text || null;
        if (body.status !== undefined) updateData.status = body.status;
        if (body.priority !== undefined) updateData.priority = body.priority || null;
        if (body.source !== undefined) updateData.source = body.source || null;
        if (body.next_followup_at !== undefined) updateData.next_followup_at = body.next_followup_at || null;
        if (body.notes !== undefined) updateData.notes = body.notes || null;

        // Update job
        const { data, error } = await supabase
            .from("jobs")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("Error updating job:", error);
            return NextResponse.json(
                { error: "Failed to update job", details: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json(data as Job);
    } catch (err) {
        console.error("Unexpected error in PUT /api/jobs/[id]:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// DELETE /api/jobs/[id] - Delete job (hard delete)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    // Auth guard
    const authError = requireAdmin(request);
    if (authError) return authError;

    try {
        requireServerEnv(ENV_KEYS.SUPABASE);
        const { id } = await params;
        const supabase = getServerSupabase();

        // Check if job exists
        const { data: existing, error: existError } = await supabase
            .from("jobs")
            .select("id")
            .eq("id", id)
            .single();

        if (existError || !existing) {
            return NextResponse.json(
                { error: "Job not found" },
                { status: 404 }
            );
        }

        // Delete job (cascade will delete related files and ai_runs)
        const { error } = await supabase.from("jobs").delete().eq("id", id);

        if (error) {
            console.error("Error deleting job:", error);
            return NextResponse.json(
                { error: "Failed to delete job", details: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, id });
    } catch (err) {
        console.error("Unexpected error in DELETE /api/jobs/[id]:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
