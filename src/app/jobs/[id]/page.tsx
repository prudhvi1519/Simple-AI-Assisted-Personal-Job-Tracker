import Button from "@/components/ui/Button";

interface JobDetailPageProps {
    params: Promise<{ id: string }>;
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
    const { id } = await params;

    // Placeholder - will be wired to Supabase in PROMPT 2
    const job = {
        id,
        company: "Acme Corp",
        role: "Senior Engineer",
        status: "Applied",
        url: "https://acme.com/careers/123",
        notes: "Great company, modern tech stack",
        created_at: "2026-01-28",
        updated_at: "2026-01-28",
    };

    return (
        <div className="max-w-3xl space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{job.company}</h1>
                    <p className="text-lg text-[var(--muted)]">{job.role}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary">Edit</Button>
                    <Button variant="danger">Delete</Button>
                </div>
            </div>

            {/* Status */}
            <div className="rounded-lg border border-[var(--border)] p-4">
                <h2 className="text-sm font-medium text-[var(--muted)] mb-2">Status</h2>
                <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-3 py-1 text-sm font-medium">
                    {job.status}
                </span>
            </div>

            {/* Details */}
            <div className="rounded-lg border border-[var(--border)] p-4 space-y-4">
                <h2 className="text-sm font-medium text-[var(--muted)]">Details</h2>

                {job.url && (
                    <div>
                        <label className="text-xs text-[var(--muted)]">Job URL</label>
                        <a
                            href={job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-[var(--primary)] hover:underline"
                        >
                            {job.url}
                        </a>
                    </div>
                )}

                {job.notes && (
                    <div>
                        <label className="text-xs text-[var(--muted)]">Notes</label>
                        <p className="mt-1">{job.notes}</p>
                    </div>
                )}
            </div>

            {/* Files section - placeholder for PROMPT 4 */}
            <div className="rounded-lg border border-[var(--border)] p-4">
                <h2 className="text-sm font-medium text-[var(--muted)] mb-4">
                    Documents
                </h2>
                <p className="text-sm text-[var(--muted)]">
                    No documents uploaded yet.
                </p>
                <Button variant="secondary" className="mt-4">
                    Upload Document
                </Button>
            </div>

            {/* Timestamps */}
            <div className="text-xs text-[var(--muted)] flex gap-4">
                <span>Created: {job.created_at}</span>
                <span>Updated: {job.updated_at}</span>
            </div>
        </div>
    );
}
