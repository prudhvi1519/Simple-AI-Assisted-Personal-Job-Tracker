/**
 * AI Extraction types and prompt builder
 */

// Strict JSON output schema for Gemini
export interface AiExtractionResult {
    title: string | null;
    companyName: string | null;
    reqId: string | null;
    jobPostUrl: string | null;
    applyUrl: string | null;
    recruiterEmails: string[];
    location: string | null;
    workMode: string | null; // Remote/Hybrid/Onsite or null
    skills: string[];
    summary: string | null;
    confidence: Record<string, number>;
    sources: Record<string, "pasted_text" | "job_page" | "apply_page" | "inferred" | "user_input">;
    warnings: string[];
}

export interface ExtractionHints {
    title?: string;
    companyName?: string;
    reqId?: string;
    recruiterEmail?: string;
    jobPostUrl?: string;
    applyUrl?: string;
}

export type TextSource = "pasted_text" | "job_page" | "apply_page";

/**
 * Build the extraction prompt for Gemini
 */
export function buildExtractionPrompt(
    textContent: string,
    textSource: TextSource,
    hints: ExtractionHints
): string {
    const hintLines: string[] = [];

    if (hints.title) hintLines.push(`- Title hint: "${hints.title}"`);
    if (hints.companyName) hintLines.push(`- Company hint: "${hints.companyName}"`);
    if (hints.reqId) hintLines.push(`- Requisition ID hint: "${hints.reqId}"`);
    if (hints.recruiterEmail) hintLines.push(`- Recruiter email hint: "${hints.recruiterEmail}"`);
    if (hints.jobPostUrl) hintLines.push(`- Job posting URL: "${hints.jobPostUrl}"`);
    if (hints.applyUrl) hintLines.push(`- Apply URL: "${hints.applyUrl}"`);

    const hintsSection =
        hintLines.length > 0
            ? `
USER-PROVIDED HINTS (use if they match the text, mark source as "user_input"):
${hintLines.join("\n")}
`
            : "";

    return `You are a job posting data extractor. Extract structured information from the job description text below.

RULES:
1. Extract ONLY information explicitly present in the text or hints.
2. Do NOT guess, infer, or hallucinate. If something is not clearly stated, return null or empty array.
3. Return ONLY valid JSON. No markdown, no commentary, no code blocks.
4. Be conservative with confidence scores.

TEXT SOURCE: ${textSource}
${hintsSection}
JOB DESCRIPTION TEXT:
---
${textContent}
---

OUTPUT JSON SCHEMA (follow exactly):
{
  "title": string|null,
  "companyName": string|null,
  "reqId": string|null,
  "jobPostUrl": string|null,
  "applyUrl": string|null,
  "recruiterEmails": string[],
  "location": string|null,
  "workMode": string|null,
  "skills": string[],
  "summary": string|null,
  "confidence": { "<field>": number },
  "sources": { "<field>": "${textSource}"|"inferred"|"user_input" },
  "warnings": string[]
}

CONFIDENCE SCORING:
- 0.9-1.0: Explicitly stated, exact match
- 0.7-0.89: Clearly implied or partially stated
- 0.5-0.69: Reasonable inference with some uncertainty
- Below 0.5: Weak inference, consider returning null instead

SOURCE VALUES:
- "${textSource}": Extracted from the provided text
- "user_input": Taken directly from user hints
- "inferred": Derived from context (use sparingly)

FIELD GUIDELINES:
- title: Job title only, not company name
- companyName: Company/organization name only
- reqId: Requisition/reference ID if mentioned
- jobPostUrl/applyUrl: Only if explicitly in text or hints
- recruiterEmails: Array of valid email addresses found
- location: City/State/Country or "Multiple locations"
- workMode: "Remote", "Hybrid", "Onsite", or null
- skills: Key technical skills and requirements (max 10)
- summary: Brief 1-2 sentence summary of the role
- warnings: Any issues encountered during extraction

Return valid JSON only:`;
}

/**
 * Retry prompt for invalid JSON
 */
export const RETRY_PROMPT = `The previous response was not valid JSON. Please return ONLY valid JSON matching the schema, with no additional text, markdown formatting, or code blocks.`;

/**
 * Empty result for error cases
 */
export function getEmptyResult(warnings: string[]): AiExtractionResult {
    return {
        title: null,
        companyName: null,
        reqId: null,
        jobPostUrl: null,
        applyUrl: null,
        recruiterEmails: [],
        location: null,
        workMode: null,
        skills: [],
        summary: null,
        confidence: {},
        sources: {},
        warnings,
    };
}
