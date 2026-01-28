import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { Job, WorkMode, WORK_MODES } from "@/lib/supabase/client";

// Force dynamic - needs env vars at runtime
export const dynamic = "force-dynamic";

interface RouteParams {
    params: Promise<{ id: string }>;
}

interface ApplyRequestBody {
    fields?: {
        title?: string | null;
        company_name?: string | null;
        req_id?: string | null;
        job_post_url?: string | null;
        apply_url?: string | null;
        recruiter_emails?: string[] | null;
        location?: string | null;
        work_mode?: string | null;
        skills?: string[] | null;
    };
    notesAppend?: string | null;
}

// POST /api/jobs/[id]/ai-apply - Apply selected AI-extracted fields
export async function POST(request: NextRequest, { params }: RouteParams) {
    const { id: jobId } = await params;
    const supabase = getServerSupabase();

    try {
        // 1) Validate job exists
        const { data: job, error: jobError } = await supabase
            .from("jobs")
            .select("*")
            .eq("id", jobId)
            .single();

        if (jobError || !job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        const existingJob = job as Job;

        // 2) Parse request body
        const body: ApplyRequestBody = await request.json();

        if (!body.fields && !body.notesAppend) {
            return NextResponse.json(
                { error: "No fields or notes to apply" },
                { status: 400 }
            );
        }

        // 3) Build update object (only include non-null values)
        const updateData: Record<string, unknown> = {};

        if (body.fields) {
            const { fields } = body;

            // Only update if value is not null/undefined
            if (fields.title !== null && fields.title !== undefined) {
                updateData.title = fields.title;
            }
            if (fields.company_name !== null && fields.company_name !== undefined) {
                updateData.company_name = fields.company_name;
            }
            if (fields.req_id !== null && fields.req_id !== undefined) {
                updateData.req_id = fields.req_id;
            }
            if (fields.job_post_url !== null && fields.job_post_url !== undefined) {
                updateData.job_post_url = fields.job_post_url;
            }
            if (fields.apply_url !== null && fields.apply_url !== undefined) {
                updateData.apply_url = fields.apply_url;
            }

            // Merge recruiter emails (unique)
            if (fields.recruiter_emails !== null && fields.recruiter_emails !== undefined) {
                const existingEmails = existingJob.recruiter_emails || [];
                const newEmails = fields.recruiter_emails || [];
                const mergedEmails = [...new Set([...existingEmails, ...newEmails])];
                updateData.recruiter_emails = mergedEmails;
            }

            // Location
            if (fields.location !== null && fields.location !== undefined) {
                updateData.location = fields.location;
            }

            // Work Mode (Validate against enum)
            if (fields.work_mode !== null && fields.work_mode !== undefined) {
                const modeStr = fields.work_mode.trim();
                const matchedMode = WORK_MODES.find(
                    (m) => m.toLowerCase() === modeStr.toLowerCase()
                );
                if (matchedMode) {
                    updateData.work_mode = matchedMode;
                }
            }

            // Skills (Split into primary/secondary)
            if (fields.skills !== null && fields.skills !== undefined && Array.isArray(fields.skills)) {
                // Dedup and normalize
                const uniqueSkills = [...new Set(fields.skills.map((s) => s.trim()).filter(Boolean))];

                // Split logic: First 6 -> primary, Rest -> secondary
                const MAX_PRIMARY = 6;
                const primary = uniqueSkills.slice(0, MAX_PRIMARY);
                const secondary = uniqueSkills.slice(MAX_PRIMARY);

                updateData.primary_skills = primary;
                updateData.secondary_skills = secondary;
            }
        }

        // 4) Handle notes append
        if (body.notesAppend && body.notesAppend.trim()) {
            const existingNotes = existingJob.notes || "";
            const separator = existingNotes ? "\n\n---\nAI Extract:\n" : "AI Extract:\n";
            updateData.notes = existingNotes + separator + body.notesAppend.trim();
        }

        // 5) Check if there's anything to update
        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: "No valid fields to update" },
                { status: 400 }
            );
        }

        // 6) Update job
        const { data: updatedJob, error: updateError } = await supabase
            .from("jobs")
            .update(updateData)
            .eq("id", jobId)
            .select()
            .single();

        if (updateError) {
            console.error("Error updating job:", updateError);
            return NextResponse.json(
                { error: "Failed to update job", details: updateError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ job: updatedJob as Job });
    } catch (err) {
        console.error("Error in AI apply:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
