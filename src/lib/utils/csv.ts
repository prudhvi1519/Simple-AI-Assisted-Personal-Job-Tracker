import { Job } from "@/lib/supabase/client";

/**
 * Convert jobs array to CSV string
 */
export function jobsToCsv(jobs: Job[]): string {
    const headers = [
        "Company",
        "Role",
        "Status",
        "URL",
        "Notes",
        "Created",
        "Updated",
    ];

    const rows = jobs.map((job) => [
        escapeCsvField(job.company || ""),
        escapeCsvField(job.role || ""),
        job.status,
        job.url || "",
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
