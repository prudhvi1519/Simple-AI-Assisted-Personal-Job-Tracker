import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireServerEnv, ENV_KEYS } from "@/lib/utils/env";
import { Job } from "@/lib/supabase/client";
import { fetchUrlAsText } from "@/lib/ai/htmlToText";
import { extractWithGemini } from "@/lib/ai/gemini";
import { ExtractionHints, TextSource, getEmptyResult } from "@/lib/ai/prompts";

// Force dynamic - needs env vars at runtime
export const dynamic = "force-dynamic";

// Validate env at module load (needs Supabase + Gemini)
// try {
//     requireServerEnv(ENV_KEYS.ALL);
// } catch {
//     // Will be caught per-request
// }

interface RouteParams {
    params: Promise<{ id: string }>;
}

interface ExtractRequestBody {
    jobPostUrl?: string;
    applyUrl?: string;
    pastedText?: string;
    title?: string;
    companyName?: string;
    reqId?: string;
    recruiterEmail?: string;
}

// POST /api/jobs/[id]/ai-extract - Extract job info using AI
export async function POST(request: NextRequest, { params }: RouteParams) {
    const { id: jobId } = await params;

    // Check env vars first
    try {
        requireServerEnv(ENV_KEYS.ALL);
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Missing env vars" },
            { status: 500 }
        );
    }

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
        const body: ExtractRequestBody = await request.json();

        // 2.5) Validate: at least one of pastedText, jobPostUrl, applyUrl must be provided
        const hasInput =
            (body.pastedText && body.pastedText.trim().length > 0) ||
            (body.jobPostUrl && body.jobPostUrl.trim().length > 0) ||
            (body.applyUrl && body.applyUrl.trim().length > 0) ||
            (existingJob.job_post_url && existingJob.job_post_url.trim().length > 0) ||
            (existingJob.apply_url && existingJob.apply_url.trim().length > 0);

        if (!hasInput) {
            return NextResponse.json(
                { error: "Add JD text or a URL to extract from." },
                { status: 400 }
            );
        }

        // 3) Build context hints from provided fields + existing job fields
        const hints: ExtractionHints = {
            title: body.title || existingJob.title || undefined,
            companyName: body.companyName || existingJob.company_name || undefined,
            reqId: body.reqId || existingJob.req_id || undefined,
            recruiterEmail: body.recruiterEmail || existingJob.recruiter_emails?.[0] || undefined,
            jobPostUrl: body.jobPostUrl || existingJob.job_post_url || undefined,
            applyUrl: body.applyUrl || existingJob.apply_url || undefined,
        };

        // 4) Determine text to extract from
        let textContent: string | null = null;
        let textSource: TextSource = "pasted_text";
        const warnings: string[] = [];

        // Priority a) pasted text
        if (body.pastedText && body.pastedText.trim().length > 50) {
            textContent = body.pastedText.trim();
            textSource = "pasted_text";
        }

        // Priority b) fetch job post URL
        if (!textContent && (body.jobPostUrl || existingJob.job_post_url)) {
            const url = body.jobPostUrl || existingJob.job_post_url!;
            const { text, error } = await fetchUrlAsText(url);
            if (text && text.length > 100) {
                textContent = text;
                textSource = "job_page";
            } else if (error) {
                warnings.push(`Failed to fetch job post URL: ${error}`);
            } else {
                warnings.push("Job post URL returned insufficient content");
            }
        }

        // Priority c) fetch apply URL
        if (!textContent && (body.applyUrl || existingJob.apply_url)) {
            const url = body.applyUrl || existingJob.apply_url!;
            const { text, error } = await fetchUrlAsText(url);
            if (text && text.length > 100) {
                textContent = text;
                textSource = "apply_page";
            } else if (error) {
                warnings.push(`Failed to fetch apply URL: ${error}`);
            } else {
                warnings.push("Apply URL returned insufficient content");
            }
        }

        // No text available
        if (!textContent) {
            const result = getEmptyResult([
                "No text available. Paste a job description or provide a working URL.",
                ...warnings,
            ]);
            return NextResponse.json({
                suggested: {
                    title: result.title,
                    companyName: result.companyName,
                    reqId: result.reqId,
                    jobPostUrl: result.jobPostUrl,
                    applyUrl: result.applyUrl,
                    recruiterEmails: result.recruiterEmails,
                    location: result.location,
                    workMode: result.workMode,
                    skills: result.skills,
                    summary: result.summary,
                },
                confidence: result.confidence,
                sources: result.sources,
                warnings: result.warnings,
            });
        }

        // 5) Get Gemini API key
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "GEMINI_API_KEY not configured" },
                { status: 500 }
            );
        }

        // 6) Call Gemini for extraction
        const extractionResult = await extractWithGemini(textContent, textSource, hints, apiKey);

        // Add any URL fetch warnings
        extractionResult.warnings = [...warnings, ...extractionResult.warnings];

        // 7) Store in ai_runs
        const inputSummary = textContent.slice(0, 500) + (textContent.length > 500 ? "..." : "");
        await supabase.from("ai_runs").insert({
            job_id: jobId,
            input_text: `[Source: ${textSource}]\n${inputSummary}`,
            extracted: {
                title: extractionResult.title,
                companyName: extractionResult.companyName,
                reqId: extractionResult.reqId,
                jobPostUrl: extractionResult.jobPostUrl,
                applyUrl: extractionResult.applyUrl,
                recruiterEmails: extractionResult.recruiterEmails,
                location: extractionResult.location,
                workMode: extractionResult.workMode,
                skills: extractionResult.skills,
                summary: extractionResult.summary,
            },
            confidence: extractionResult.confidence,
            sources: extractionResult.sources,
            warnings: extractionResult.warnings,
        });

        // 8) Return result
        return NextResponse.json({
            suggested: {
                title: extractionResult.title,
                companyName: extractionResult.companyName,
                reqId: extractionResult.reqId,
                jobPostUrl: extractionResult.jobPostUrl,
                applyUrl: extractionResult.applyUrl,
                recruiterEmails: extractionResult.recruiterEmails,
                location: extractionResult.location,
                workMode: extractionResult.workMode,
                skills: extractionResult.skills,
                summary: extractionResult.summary,
            },
            confidence: extractionResult.confidence,
            sources: extractionResult.sources,
            warnings: extractionResult.warnings,
        });
    } catch (err) {
        console.error("Error in AI extract:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
