import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireServerEnv, ENV_KEYS } from "@/lib/utils/env";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import {
    Job,
    JobsListResponse,
    CreateJobRequest,
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

// validate env at module load (fail fast) - REMOVED due to load timing
// try {
//     requireServerEnv(ENV_KEYS.SUPABASE);
// } catch {
//     // Will be caught per-request if called
// }

// GET /api/jobs - List jobs with optional filters
export async function GET(request: NextRequest) {
    // Auth guard
    const authError = requireAdmin(request);
    if (authError) return authError;

    try {
        requireServerEnv(ENV_KEYS.SUPABASE);
        const supabase = getServerSupabase();
        const { searchParams } = new URL(request.url);

        // Query parameters
        const query = searchParams.get("query")?.trim();
        const status = searchParams.get("status");

        // Build query
        let dbQuery = supabase.from("jobs").select("*", { count: "exact" });

        // Text search in title, company_name, req_id, notes
        if (query) {
            dbQuery = dbQuery.or(
                `title.ilike.%${query}%,company_name.ilike.%${query}%,req_id.ilike.%${query}%,notes.ilike.%${query}%`
            );
        }

        // Status filter (exact match)
        if (status && isValidJobStatus(status)) {
            dbQuery = dbQuery.eq("status", status);
        }

        // Priority filter (exact match)
        const priority = searchParams.get("priority");
        if (priority && isValidPriority(priority)) {
            dbQuery = dbQuery.eq("priority", priority);
        }

        // Work Mode filter (exact match)
        const workMode = searchParams.get("work_mode");
        if (workMode && isValidWorkMode(workMode)) {
            dbQuery = dbQuery.eq("work_mode", workMode);
        }

        // Order by updated_at desc
        dbQuery = dbQuery.order("updated_at", { ascending: false });

        const { data, error, count } = await dbQuery;

        if (error) {
            console.error("Error fetching jobs:", error);
            return NextResponse.json(
                { error: "Failed to fetch jobs", details: error.message },
                { status: 500 }
            );
        }

        // Fetch resume availability for these jobs (avoid N+1)
        const jobs = (data as Job[]) || [];
        const jobIds = jobs.map((j) => j.id);

        // Map job_id -> resume_file_id
        const resumeMap = new Map<string, string>();

        if (jobIds.length > 0) {
            const { data: files } = await supabase
                .from("job_files")
                .select("job_id, id")
                .in("job_id", jobIds)
                .eq("file_type", "resume");

            if (files) {
                files.forEach((f) => {
                    // Just take the first one found if multiple (usually 1)
                    if (!resumeMap.has(f.job_id)) {
                        resumeMap.set(f.job_id, f.id);
                    }
                });
            }
        }

        // Attach to items
        const enrichedItems = jobs.map(job => ({
            ...job,
            hasResume: resumeMap.has(job.id),
            resumeFileId: resumeMap.get(job.id) || null
        }));

        const response: JobsListResponse = {
            items: enrichedItems,
            total: count || 0,
        };

        return NextResponse.json(response, {
            headers: {
                "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            }
        });
    } catch (err) {
        console.error("Unexpected error in GET /api/jobs:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// POST /api/jobs - Create a new job
export async function POST(request: NextRequest) {
    // Auth guard
    const authError = requireAdmin(request);
    if (authError) return authError;

    try {
        requireServerEnv(ENV_KEYS.SUPABASE);
        const supabase = getServerSupabase();

        // Parse request body
        let body: CreateJobRequest;
        try {
            body = await request.json();
        } catch {
            // Empty body is allowed - will create with defaults
            body = {};
        }

        // Validate status if provided
        const status = body.status || "Saved";
        if (!isValidJobStatus(status)) {
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
        if (body.work_mode && !isValidWorkMode(body.work_mode)) {
            return NextResponse.json(
                {
                    error: "Invalid work_mode",
                    details: `Work mode must be one of: ${WORK_MODES.join(", ")}`,
                },
                { status: 400 }
            );
        }

        // Validate priority if provided
        if (body.priority && !isValidPriority(body.priority)) {
            return NextResponse.json(
                {
                    error: "Invalid priority",
                    details: `Priority must be one of: ${PRIORITIES.join(", ")}`,
                },
                { status: 400 }
            );
        }

        // Prepare insert data
        const insertData = {
            title: body.title || null,
            company_name: body.company_name || null,
            req_id: body.req_id || null,
            job_post_url: body.job_post_url || null,
            apply_url: body.apply_url || null,
            recruiter_emails: body.recruiter_emails || [],
            recruiter_name: body.recruiter_name || null,
            primary_skills: body.primary_skills || [],
            secondary_skills: body.secondary_skills || [],
            location: body.location || null,
            work_mode: body.work_mode || null,
            compensation_text: body.compensation_text || null,
            status,
            priority: body.priority || null,
            source: body.source || null,
            next_followup_at: body.next_followup_at || null,
            notes: body.notes || null,
        };

        // Insert job
        const { data, error } = await supabase
            .from("jobs")
            .insert(insertData)
            .select()
            .single();

        if (error) {
            console.error("Error creating job:", error);
            return NextResponse.json(
                { error: "Failed to create job", details: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json(data as Job, { status: 201 });
    } catch (err) {
        console.error("Unexpected error in POST /api/jobs:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
