import { createClient } from "@supabase/supabase-js";

// Client-side Supabase client
// Use this for browser/client components

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definitions for our database
export type JobStatus =
    | "Saved"
    | "Applied"
    | "Recruiter Screen"
    | "Technical"
    | "Final"
    | "Offer"
    | "Rejected"
    | "Ghosted";

export type FileType = "resume" | "document";

export interface Job {
    id: string;
    company: string | null;
    role: string | null;
    status: JobStatus;
    url: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface JobFile {
    id: string;
    job_id: string;
    file_name: string;
    file_type: FileType;
    storage_path: string;
    created_at: string;
}

export const JOB_STATUSES: JobStatus[] = [
    "Saved",
    "Applied",
    "Recruiter Screen",
    "Technical",
    "Final",
    "Offer",
    "Rejected",
    "Ghosted",
];
