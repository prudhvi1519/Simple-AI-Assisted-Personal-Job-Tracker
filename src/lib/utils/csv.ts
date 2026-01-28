import { Job } from "@/lib/supabase/client";

/**
 * Convert jobs array to CSV string
 */
export function jobsToCsv(jobs: Job[]): string {
    const headers = [
        "Title",
        "Company",
        "Req ID",
        "Status",
        "Job URL",
        "Apply URL",
        "Recruiter Emails",
        "Notes",
        "Created",
        "Updated",
    ];

    const rows = jobs.map((job) => [
        escapeCsvField(job.title || ""),
        escapeCsvField(job.company_name || ""),
        escapeCsvField(job.req_id || ""),
        job.status,
        job.job_post_url || "",
        job.apply_url || "",
        job.recruiter_emails.join("; "),
        escapeCsvField(job.notes || ""),
        job.created_at,
        job.updated_at,
    ]);

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

/**
 * Escape a CSV field (handle commas, quotes, newlines)
 */
function escapeCsvField(field: string): string {
    if (field.includes(",") || field.includes('"') || field.includes("\n")) {
        return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
}

/**
 * Trigger download of CSV file
 */
export function downloadCsv(content: string, filename: string): void {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}
