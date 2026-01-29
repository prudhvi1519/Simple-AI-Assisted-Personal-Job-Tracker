import { NextRequest, NextResponse } from "next/server";
import { requireServerEnv, ENV_KEYS } from "@/lib/utils/env";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { extractWithGemini, GeminiRateLimitError } from "@/lib/ai/gemini";
import { ExtractionHints, TextSource, getEmptyResult } from "@/lib/ai/prompts";

// Force dynamic - needs env vars at runtime
export const dynamic = "force-dynamic";

interface ExtractRequestBody {
    text?: string;
    url?: string;
}

// POST /api/ai/job-extract - Extract job info from text without requiring existing job
export async function POST(request: NextRequest) {
    // Auth guard
    const authError = requireAdmin(request);
    if (authError) return authError;

    // Check env vars first
    try {
        requireServerEnv(ENV_KEYS.GEMINI);
    } catch (err) {
        return NextResponse.json(
            { ok: false, error: err instanceof Error ? err.message : "Missing env vars" },
            { status: 500 }
        );
    }

    try {
        const body: ExtractRequestBody = await request.json();

        // Validate: at least text must be provided
        const hasText = body.text && body.text.trim().length > 0;

        if (!hasText) {
            return NextResponse.json(
                { ok: false, error: "Please provide job description text to extract from." },
                { status: 400 }
            );
        }

        const textContent = body.text!.trim();

        // Build minimal hints
        const hints: ExtractionHints = {
            jobPostUrl: body.url || undefined,
        };

        // Get API key
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { ok: false, error: "Gemini API key not configured" },
                { status: 500 }
            );
        }

        // Call Gemini for extraction
        const result = await extractWithGemini(textContent, "pasted_text" as TextSource, hints, apiKey);

        return NextResponse.json({
            ok: true,
            model: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
            data: result,
            warnings: [],
        });

    } catch (err) {
        // Handle rate limit errors
        if (err instanceof GeminiRateLimitError) {
            return NextResponse.json(
                {
                    ok: false,
                    code: 429,
                    status: "RESOURCE_EXHAUSTED",
                    retryAfterSeconds: err.retryAfterSeconds || 60,
                    message: "Rate limited. Please wait before trying again.",
                },
                { status: 429 }
            );
        }

        console.error("Error in POST /api/ai/job-extract:", err);
        return NextResponse.json(
            { ok: false, error: "Failed to extract job information" },
            { status: 500 }
        );
    }
}
