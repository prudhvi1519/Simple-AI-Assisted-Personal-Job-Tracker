"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { JobDetailResponse, JobFile, JOB_STATUSES, JobStatus } from "@/lib/supabase/client";
import { formatDate, formatRelativeTime, formatFileSize } from "@/lib/utils/format";

interface JobDetailPageProps {
    params: Promise<{ id: string }>;
}

// Status options for dropdown
const STATUS_OPTIONS = JOB_STATUSES.map((s) => ({ value: s, label: s }));

export default function JobDetailPage({ params }: JobDetailPageProps) {
    const router = useRouter();
    const [id, setId] = useState<string | null>(null);

    // State
    const [job, setJob] = useState<JobDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notFound, setNotFound] = useState(false);

    // Edit form state
    const [formData, setFormData] = useState({
        title: "",
        company_name: "",
        req_id: "",
        job_post_url: "",
        apply_url: "",
        recruiter_emails: "",
        notes: "",
        status: "Saved" as JobStatus,
    });
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);

    // Delete modal
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Resolve params
    useEffect(() => {
        params.then((p) => setId(p.id));
    }, [params]);

    // Fetch job
    const fetchJob = useCallback(async () => {
        if (!id) return;

        try {
            setLoading(true);
            setError(null);
            setNotFound(false);

            const res = await fetch(`/api/jobs/${id}`);
            if (res.status === 404) {
                setNotFound(true);
                return;
            }
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to fetch job");
            }

            const data: JobDetailResponse = await res.json();
            setJob(data);

            // Initialize form with job data
            setFormData({
                title: data.title || "",
                company_name: data.company_name || "",
                req_id: data.req_id || "",
                job_post_url: data.job_post_url || "",
                apply_url: data.apply_url || "",
                recruiter_emails: data.recruiter_emails.join(", "),
                notes: data.notes || "",
                status: data.status,
            });
            setHasChanges(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchJob();
    }, [fetchJob]);

    // Handle form changes
    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setHasChanges(true);
    };

    // Save changes
    const handleSave = async () => {
        if (!id) return;

        setSaving(true);
        setSaveError(null);

        try {
            // Parse recruiter emails from comma-separated string
            const emails = formData.recruiter_emails
                .split(",")
                .map((e) => e.trim())
                .filter((e) => e.length > 0);

            const res = await fetch(`/api/jobs/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: formData.title || null,
                    company_name: formData.company_name || null,
                    req_id: formData.req_id || null,
                    job_post_url: formData.job_post_url || null,
                    apply_url: formData.apply_url || null,
                    recruiter_emails: emails,
                    notes: formData.notes || null,
                    status: formData.status,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to save changes");
            }

            // Refresh job data
            await fetchJob();
            setHasChanges(false);
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    // Delete job
    const handleDelete = async () => {
        if (!id) return;

        setDeleting(true);
        try {
            const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to delete job");
            }
            router.push("/jobs");
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to delete job");
            setDeleting(false);
        }
    };

    // Loading state
    if (loading || !id) {
        return (
            <div className="flex items-center justify-center py-12">
                <Spinner size="lg" />
            </div>
        );
    }

    // Not found state
    if (notFound) {
        return (
            <div className="text-center py-12">
                <h1 className="text-2xl font-bold mb-2">Job Not Found</h1>
                <p className="text-[var(--muted)] mb-6">
                    The job you are looking for does not exist or has been deleted.
                </p>
                <Button onClick={() => router.push("/jobs")}>Back to Jobs</Button>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="text-center py-12">
                <h1 className="text-2xl font-bold mb-2">Error</h1>
                <p className="text-red-600 mb-6">{error}</p>
                <Button onClick={() => fetchJob()}>Retry</Button>
            </div>
        );
    }

    if (!job) return null;

    // Split files by type
    const resumes = job.files.filter((f) => f.file_type === "resume");
    const documents = job.files.filter((f) => f.file_type === "document");

    return (
        <div className="max-w-3xl space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">
                        {job.title || (
                            <span className="text-[var(--muted)] italic">Untitled</span>
                        )}
                    </h1>
                    <p className="text-lg text-[var(--muted)]">
                        {job.company_name || "-"}
                    </p>
                    <p className="text-sm text-[var(--muted)] mt-1">
                        Updated {formatRelativeTime(job.updated_at)}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="secondary"
                        onClick={() => router.push("/jobs")}
                    >
                        ← Back
                    </Button>
                    <Button
                        variant="danger"
                        onClick={() => setShowDeleteModal(true)}
                    >
                        Delete
                    </Button>
                </div>
            </div>

            {/* Status Section */}
            <div className="rounded-lg border border-[var(--border)] p-4">
                <label className="block text-sm font-medium text-[var(--muted)] mb-2">
                    Status
                </label>
                <div className="w-48">
                    <Select
                        options={STATUS_OPTIONS}
                        value={formData.status}
                        onChange={(e) => handleChange("status", e.target.value)}
                    />
                </div>
            </div>

            {/* Edit Form */}
            <div className="rounded-lg border border-[var(--border)] p-6 space-y-4">
                <h2 className="text-lg font-medium mb-4">Job Details</h2>

                {saveError && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 text-sm">
                        {saveError}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Title</label>
                        <Input
                            placeholder="e.g., Senior Software Engineer"
                            value={formData.title}
                            onChange={(e) => handleChange("title", e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Company</label>
                        <Input
                            placeholder="e.g., Acme Corp"
                            value={formData.company_name}
                            onChange={(e) => handleChange("company_name", e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">
                        Requisition ID
                    </label>
                    <Input
                        placeholder="e.g., REQ-12345"
                        value={formData.req_id}
                        onChange={(e) => handleChange("req_id", e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Job Posting URL
                        </label>
                        <Input
                            type="url"
                            placeholder="https://..."
                            value={formData.job_post_url}
                            onChange={(e) => handleChange("job_post_url", e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Apply URL</label>
                        <Input
                            type="url"
                            placeholder="https://..."
                            value={formData.apply_url}
                            onChange={(e) => handleChange("apply_url", e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">
                        Recruiter Emails
                        <span className="font-normal text-[var(--muted)]">
                            {" "}
                            (comma-separated)
                        </span>
                    </label>
                    <Input
                        placeholder="recruiter1@company.com, recruiter2@company.com"
                        value={formData.recruiter_emails}
                        onChange={(e) => handleChange("recruiter_emails", e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Notes</label>
                    <textarea
                        className="w-full h-32 px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-none"
                        placeholder="Any additional notes..."
                        value={formData.notes}
                        onChange={(e) => handleChange("notes", e.target.value)}
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                    <Button
                        onClick={handleSave}
                        isLoading={saving}
                        disabled={!hasChanges}
                    >
                        Save Changes
                    </Button>
                </div>
            </div>

            {/* Files Section */}
            <div className="space-y-4">
                {/* Resumes */}
                <div className="rounded-lg border border-[var(--border)] p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-medium">
                            Resumes{" "}
                            <span className="text-[var(--muted)] font-normal">
                                ({resumes.length})
                            </span>
                        </h2>
                        <Button variant="secondary" disabled title="Upload coming soon">
                            + Upload Resume
                        </Button>
                    </div>

                    {resumes.length === 0 ? (
                        <p className="text-sm text-[var(--muted)] py-4 text-center">
                            No resumes uploaded yet.
                        </p>
                    ) : (
                        <FileList files={resumes} />
                    )}
                </div>

                {/* Documents */}
                <div className="rounded-lg border border-[var(--border)] p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-medium">
                            Documents{" "}
                            <span className="text-[var(--muted)] font-normal">
                                ({documents.length})
                            </span>
                        </h2>
                        <Button variant="secondary" disabled title="Upload coming soon">
                            + Upload Document
                        </Button>
                    </div>

                    {documents.length === 0 ? (
                        <p className="text-sm text-[var(--muted)] py-4 text-center">
                            No documents uploaded yet.
                        </p>
                    ) : (
                        <FileList files={documents} />
                    )}
                </div>
            </div>

            {/* Timestamps */}
            <div className="text-xs text-[var(--muted)] flex gap-4 pt-4 border-t border-[var(--border)]">
                <span>Created: {formatDate(job.created_at)}</span>
                <span>Updated: {formatDate(job.updated_at)}</span>
            </div>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Delete Job"
            >
                <p className="text-[var(--muted)]">
                    Are you sure you want to delete this job? All associated files and AI
                    runs will also be deleted. This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleDelete}
                        isLoading={deleting}
                    >
                        Delete Job
                    </Button>
                </div>
            </Modal>
        </div>
    );
}

// File list component
function FileList({ files }: { files: JobFile[] }) {
    return (
        <div className="divide-y divide-[var(--border)]">
            {files.map((file) => (
                <div
                    key={file.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.original_name}</p>
                        <p className="text-xs text-[var(--muted)]">
                            {file.size_bytes ? formatFileSize(file.size_bytes) : "—"}
                            {" • "}
                            {formatRelativeTime(file.created_at)}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                        <Button
                            variant="ghost"
                            disabled
                            title="Download coming soon"
                            className="text-sm px-2 py-1"
                        >
                            Download
                        </Button>
                        <Button
                            variant="ghost"
                            disabled
                            title="Delete coming soon"
                            className="text-sm px-2 py-1 text-red-600"
                        >
                            Delete
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
}
