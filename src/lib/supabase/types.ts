// ============================================================================
// Type Definitions
// ============================================================================

// Job status enum - exact list from schema
export const JOB_STATUSES = [
    "Saved",
    "Applied",
    "Recruiter Screen",
    "Technical",
    "Final",
    "Offer",
    "Rejected",
    "Ghosted",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

// File type enum
export const FILE_TYPES = ["resume", "document"] as const;
export type FileType = (typeof FILE_TYPES)[number];

// Job record from database
export interface Job {
    id: string;
    title: string | null;
    company_name: string | null;
    req_id: string | null;
    job_post_url: string | null;
    apply_url: string | null;
    recruiter_emails: string[];
    status: JobStatus;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

// Job file record from database
export interface JobFile {
    id: string;
    job_id: string;
    file_type: FileType;
    original_name: string;
    storage_path: string;
    mime_type: string | null;
    size_bytes: number | null;
    created_at: string;
}

// AI run record from database
export interface AiRun {
    id: string;
    job_id: string;
    input_text: string | null;
    extracted: Record<string, unknown>;
    confidence: Record<string, number>;
    sources: Record<string, string>;
    warnings: string[];
    created_at: string;
}

// API request/response types
export interface CreateJobRequest {
    title?: string;
    company_name?: string;
    req_id?: string;
    job_post_url?: string;
    apply_url?: string;
    recruiter_emails?: string[];
    status?: JobStatus;
    notes?: string;
}

export interface UpdateJobRequest extends Partial<CreateJobRequest> { }

export interface JobsListResponse {
    items: Job[];
    total: number;
}

export interface JobDetailResponse extends Job {
    file_counts: {
        resume: number;
        document: number;
    };
    latest_ai_run: AiRun | null;
}

// Validation helper
export function isValidJobStatus(status: string): status is JobStatus {
    return JOB_STATUSES.includes(status as JobStatus);
}

// URL validation helper
export function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}
