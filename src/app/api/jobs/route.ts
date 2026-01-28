import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireServerEnv, ENV_KEYS } from "@/lib/utils/env";
import {
    Job,
    JobsListResponse,
    CreateJobRequest,
    JOB_STATUSES,
    isValidJobStatus,
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

        const response: JobsListResponse = {
            items: (data as Job[]) || [],
            total: count || 0,
        };

        return NextResponse.json(response);
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

        // Prepare insert data
        const insertData = {
            title: body.title || null,
            company_name: body.company_name || null,
            req_id: body.req_id || null,
            job_post_url: body.job_post_url || null,
            apply_url: body.apply_url || null,
            recruiter_emails: body.recruiter_emails || [],
            status,
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
