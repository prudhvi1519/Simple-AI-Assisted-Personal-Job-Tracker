/**
 * Gemini API client for job extraction
 */

import {
    AiExtractionResult,
    ExtractionHints,
    TextSource,
    buildExtractionPrompt,
    RETRY_PROMPT,
    getEmptyResult,
} from "./prompts";

// Use configured model or default to gemini-2.5-flash-lite (Free Tier preferred)
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface GeminiResponse {
    candidates?: Array<{
        content?: {
            parts?: Array<{
                text?: string;
            }>;
        };
    }>;
    error?: {
        message: string;
    };
}

/**
 * Call Gemini API with the extraction prompt
 */
async function callGemini(prompt: string, apiKey: string): Promise<{ text: string | null; error: string | null }> {
    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [{ text: prompt }],
                    },
                ],
                generationConfig: {
                    temperature: 0.1, // Low temperature for consistent extraction
                    maxOutputTokens: 2048,
                },
            }),
        });

        if (!response.ok) {
            const status = response.status;
            const errorText = await response.text();

            // Handle 429 Rate Limit specifically
            if (status === 429) {
                // Try to extract retry delay if available in text or headers (though usually headers)
                // Gemini error text example: ... "status": "RESOURCE_EXHAUSTED" ...
                let retryAfter = 15; // default

                // If specific check needed for "quota 0", it's usually in the message.
                // We'll return a clean JSON error as requested.

                // Return structured error via the text/error contract
                // We'll serialize it so the caller can parse it back if they want,
                // but effectively we just need to return a clean string message for now,
                // OR strict JSON if we change the return type.
                // The current contract returns { text, error: string }.
                // We will flatten it into a readable error message for the UI.
                return {
                    text: null,
                    error: JSON.stringify({
                        type: "RATE_LIMIT",
                        status: 429,
                        message: `Gemini rate limit hit on free tier. Retry after ${retryAfter}s or switch GEMINI_MODEL.`,
                        retryAfterSeconds: retryAfter,
                        model: GEMINI_MODEL
                    })
                };
            }

            return { text: null, error: `Gemini API error: ${status} - ${errorText}` };
        }

        const data: GeminiResponse = await response.json();

        if (data.error) {
            return { text: null, error: data.error.message };
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            return { text: null, error: "Empty response from Gemini" };
        }

        return { text, error: null };
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error calling Gemini";
        return { text: null, error: errorMessage };
    }
}

/**
 * Parse and validate Gemini response as JSON
 */
function parseGeminiResponse(text: string): AiExtractionResult | null {
    try {
        // Remove potential markdown code blocks
        let cleaned = text.trim();
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.slice(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.slice(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.slice(0, -3);
        }
        cleaned = cleaned.trim();

        const parsed = JSON.parse(cleaned);

        // Validate required structure
        if (typeof parsed !== "object" || parsed === null) {
            return null;
        }

        // Normalize and validate the result
        return normalizeExtractionResult(parsed);
    } catch {
        return null;
    }
}

/**
 * Normalize extraction result with validation
 */
function normalizeExtractionResult(raw: Record<string, unknown>): AiExtractionResult {
    // Helper to get string or null
    const getString = (value: unknown): string | null => {
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
        return null;
    };

    // Helper to get array of strings
    const getStringArray = (value: unknown): string[] => {
        if (!Array.isArray(value)) return [];
        return value
            .filter((item): item is string => typeof item === "string")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
    };

    // Email validation regex (basic)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Validate emails
    const rawEmails = getStringArray(raw.recruiterEmails);
    const validEmails = rawEmails.filter((email) => emailRegex.test(email));

    // Normalize confidence (0-1)
    const confidence: Record<string, number> = {};
    if (typeof raw.confidence === "object" && raw.confidence !== null) {
        for (const [key, value] of Object.entries(raw.confidence as Record<string, unknown>)) {
            if (typeof value === "number") {
                confidence[key] = Math.max(0, Math.min(1, value));
            }
        }
    }

    // Normalize sources
    const validSources = ["pasted_text", "job_page", "apply_page", "inferred", "user_input"];
    const sources: Record<string, "pasted_text" | "job_page" | "apply_page" | "inferred" | "user_input"> = {};
    if (typeof raw.sources === "object" && raw.sources !== null) {
        for (const [key, value] of Object.entries(raw.sources as Record<string, unknown>)) {
            if (typeof value === "string" && validSources.includes(value)) {
                sources[key] = value as "pasted_text" | "job_page" | "apply_page" | "inferred" | "user_input";
            }
        }
    }

    // Normalize workMode
    let workMode = getString(raw.workMode);
    if (workMode) {
        const normalized = workMode.toLowerCase();
        if (normalized.includes("remote")) {
            workMode = "Remote";
        } else if (normalized.includes("hybrid")) {
            workMode = "Hybrid";
        } else if (normalized.includes("onsite") || normalized.includes("on-site") || normalized.includes("office")) {
            workMode = "Onsite";
        }
    }

    // Get skills (max 10, unique)
    const skills = [...new Set(getStringArray(raw.skills))].slice(0, 10);

    // Get warnings
    const warnings = getStringArray(raw.warnings);

    return {
        title: getString(raw.title),
        companyName: getString(raw.companyName),
        reqId: getString(raw.reqId),
        jobPostUrl: getString(raw.jobPostUrl),
        applyUrl: getString(raw.applyUrl),
        recruiterEmails: [...new Set(validEmails)],
        location: getString(raw.location),
        workMode,
        skills,
        summary: getString(raw.summary),
        confidence,
        sources,
        warnings,
    };
}

/**
 * Extract job information using Gemini
 */
export async function extractWithGemini(
    textContent: string,
    textSource: TextSource,
    hints: ExtractionHints,
    apiKey: string
): Promise<AiExtractionResult> {
    // Limit text content
    const maxChars = 15000;
    const truncatedText = textContent.slice(0, maxChars);

    // Build prompt
    const prompt = buildExtractionPrompt(truncatedText, textSource, hints);

    // First attempt
    const { text: response1, error: error1 } = await callGemini(prompt, apiKey);

    if (error1) {
        return getEmptyResult([`Gemini API error: ${error1}`]);
    }

    if (!response1) {
        return getEmptyResult(["Empty response from Gemini"]);
    }

    // Try to parse
    let result = parseGeminiResponse(response1);

    if (result) {
        return result;
    }

    // Retry with additional instruction
    console.log("First Gemini response was invalid JSON, retrying...");
    const retryPrompt = prompt + "\n\n" + RETRY_PROMPT;
    const { text: response2, error: error2 } = await callGemini(retryPrompt, apiKey);

    if (error2) {
        return getEmptyResult([`Gemini retry error: ${error2}`]);
    }

    if (!response2) {
        return getEmptyResult(["Empty response from Gemini on retry"]);
    }

    result = parseGeminiResponse(response2);

    if (result) {
        return result;
    }

    return getEmptyResult(["Gemini returned invalid JSON after retry"]);
}
