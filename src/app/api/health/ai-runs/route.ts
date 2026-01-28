import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireServerEnv, ENV_KEYS } from "@/lib/utils/env";

// Force dynamic - needs env vars at runtime
export const dynamic = "force-dynamic";

/**
 * GET /api/health/ai-runs - Test ai_runs table insert/select/delete
 * Creates a temp job, inserts ai_run, verifies, then cleans up
 */
export async function GET() {
    let tempJobId: string | null = null;
    let tempAiRunId: string | null = null;

    try {
        // 1) Validate env vars
        try {
            requireServerEnv(ENV_KEYS.SUPABASE);
        } catch (err) {
            return NextResponse.json(
                {
                    ok: false,
                    error: err instanceof Error ? err.message : "Missing env vars",
                },
                { status: 503 }
            );
        }

        const supabase = getServerSupabase();

        // 2) Create temporary job (to satisfy FK constraint)
        const { data: tempJob, error: jobError } = await supabase
            .from("jobs")
            .insert({
                title: "healthcheck_temp_job",
                status: "Saved",
            })
            .select("id")
            .single();

        if (jobError || !tempJob) {
            console.error("ai_runs health: failed to create temp job", jobError);
            return NextResponse.json(
                {
                    ok: false,
                    error: jobError?.message || "Failed to create temp job",
                },
                { status: 503 }
            );
        }

        tempJobId = tempJob.id;

        // 3) Insert test ai_run row
        const { data: insertedRun, error: insertError } = await supabase
            .from("ai_runs")
            .insert({
                job_id: tempJobId,
                input_text: "healthcheck",
                extracted: {},
                confidence: {},
                sources: {},
                warnings: [],
            })
            .select("id")
            .single();

        if (insertError || !insertedRun) {
            console.error("ai_runs health: insert failed", insertError);
            // Cleanup temp job
            await supabase.from("jobs").delete().eq("id", tempJobId);
            return NextResponse.json(
                {
                    ok: false,
                    inserted: false,
                    selected: false,
                    deleted: false,
                    error: insertError?.message || "Insert failed",
                },
                { status: 503 }
            );
        }

        tempAiRunId = insertedRun.id;

        // 4) Select the inserted row back
        const { data: selectedRun, error: selectError } = await supabase
            .from("ai_runs")
            .select("*")
            .eq("id", tempAiRunId)
            .single();

        if (selectError || !selectedRun) {
            console.error("ai_runs health: select failed", selectError);
            // Cleanup
            await supabase.from("ai_runs").delete().eq("id", tempAiRunId);
            await supabase.from("jobs").delete().eq("id", tempJobId);
            return NextResponse.json(
                {
                    ok: false,
                    inserted: true,
                    selected: false,
                    deleted: false,
                    error: selectError?.message || "Select failed",
                },
                { status: 503 }
            );
        }

        // 5) Delete ai_run row
        const { error: deleteRunError } = await supabase
            .from("ai_runs")
            .delete()
            .eq("id", tempAiRunId);

        if (deleteRunError) {
            console.error("ai_runs health: delete ai_run failed", deleteRunError);
            // Try to cleanup job anyway
            await supabase.from("jobs").delete().eq("id", tempJobId);
            return NextResponse.json(
                {
                    ok: false,
                    inserted: true,
                    selected: true,
                    deleted: false,
                    error: deleteRunError.message || "Delete ai_run failed",
                },
                { status: 503 }
            );
        }

        // 6) Delete temp job
        const { error: deleteJobError } = await supabase
            .from("jobs")
            .delete()
            .eq("id", tempJobId);

        if (deleteJobError) {
            console.error("ai_runs health: delete temp job failed", deleteJobError);
            // Non-critical, but note it
        }

        // 7) Success
        return NextResponse.json({
            ok: true,
            inserted: true,
            selected: true,
            deleted: true,
        });
    } catch (err) {
        console.error("ai_runs health: unexpected error", err);

        // Best-effort cleanup
        const supabase = getServerSupabase();
        if (tempAiRunId) {
            await supabase.from("ai_runs").delete().eq("id", tempAiRunId);
        }
        if (tempJobId) {
            await supabase.from("jobs").delete().eq("id", tempJobId);
        }

        return NextResponse.json(
            {
                ok: false,
                error: err instanceof Error ? err.message : "Unexpected error",
            },
            { status: 500 }
        );
    }
}
