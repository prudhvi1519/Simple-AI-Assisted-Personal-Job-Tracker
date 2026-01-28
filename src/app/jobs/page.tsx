"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import Badge from "@/components/ui/Badge";
import AiAssistModal from "@/components/jobs/AiAssistModal";
import { Job, JOB_STATUSES, JobStatus } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils/format";

// Status options for filter dropdown
const STATUS_OPTIONS = [
    { value: "", label: "All Statuses" },
    ...JOB_STATUSES.map((s) => ({ value: s, label: s })),
];

// Status options for form dropdown
const FORM_STATUS_OPTIONS = JOB_STATUSES.map((s) => ({ value: s, label: s }));

function getStatusColor(status: string): string {
    switch (status) {
        case "Saved":
            return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
        case "Applied":
            return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
        case "Recruiter Screen":
            return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
        case "Technical":
            return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";
        case "Final":
            return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200";
        case "Offer":
            return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
        case "Rejected":
            return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
        case "Ghosted":
            return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
        default:
            return "bg-gray-100 text-gray-800";
    }
}

// Get missing info badges for a job (max 2, priority: Link > Title > Company)
function getMissingBadges(job: Job): string[] {
    const missing: string[] = [];

    // Priority order: Missing Link > Missing Title > Missing Company
    if (!job.job_post_url && !job.apply_url) {
        missing.push("Missing Link");
    }
    if (!job.title) {
        missing.push("Missing Title");
    }
    if (!job.company_name) {
        missing.push("Missing Company");
    }

    return missing.slice(0, 2); // Max 2 badges
}

export default function JobsPage() {
    const router = useRouter();

    // State
    const [jobs, setJobs] = useState<Job[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    // Add Job Modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        title: "",
        company_name: "",
        req_id: "",
        job_post_url: "",
        apply_url: "",
        recruiter_email: "",
        notes: "",
        status: "Saved" as JobStatus,
    });

    // Delete confirmation
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // AI Assist modal
    const [aiAssistJob, setAiAssistJob] = useState<Job | null>(null);

    // Fetch jobs
    const fetchJobs = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams();
            if (query) params.set("query", query);
            if (statusFilter) params.set("status", statusFilter);

            const res = await fetch(`/api/jobs?${params.toString()}`);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to fetch jobs");
            }

            const data = await res.json();
            setJobs(data.items);
            setTotal(data.total);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    }, [query, statusFilter]);

    // Initial fetch and refetch on filter change
    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchJobs();
        }, 300);
        return () => clearTimeout(timer);
    }, [query, fetchJobs]);

    // Handle add job
    const handleAddJob = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError(null);

        try {
            const body = {
                title: formData.title || undefined,
                company_name: formData.company_name || undefined,
                req_id: formData.req_id || undefined,
                job_post_url: formData.job_post_url || undefined,
                apply_url: formData.apply_url || undefined,
                recruiter_emails: formData.recruiter_email
                    ? [formData.recruiter_email]
                    : [],
                notes: formData.notes || undefined,
                status: formData.status,
            };

            const res = await fetch("/api/jobs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to create job");
            }

            // Reset form and close modal
            setFormData({
                title: "",
                company_name: "",
                req_id: "",
                job_post_url: "",
                apply_url: "",
                recruiter_email: "",
                notes: "",
                status: "Saved",
            });
            setShowAddModal(false);
            fetchJobs();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setFormLoading(false);
        }
    };

    // Handle delete job
    const handleDelete = async () => {
        if (!deleteId) return;

        setDeleteLoading(true);
        try {
            const res = await fetch(`/api/jobs/${deleteId}`, { method: "DELETE" });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to delete job");
            }

            setDeleteId(null);
            fetchJobs();
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to delete job");
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Jobs</h1>
                    <p className="text-[var(--muted)] text-sm">
                        {total} job{total !== 1 ? "s" : ""} tracked
                    </p>
                </div>
                <Button onClick={() => setShowAddModal(true)}>+ Add Job</Button>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="flex-1">
                    <Input
                        placeholder="Search jobs..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
                <div className="w-48">
                    <Select
                        options={STATUS_OPTIONS}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    />
                </div>
            </div>

            {/* Error state */}
            {error && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-200">
                    {error}
                    <button
                        className="ml-4 underline"
                        onClick={() => {
                            setError(null);
                            fetchJobs();
                        }}
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Loading state */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Spinner size="lg" />
                </div>
            )}

            {/* Jobs Table */}
            {!loading && !error && jobs.length > 0 && (
                <div className="overflow-hidden rounded-lg border border-[var(--border)]">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--muted)]">
                                    Title
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--muted)]">
                                    Company
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--muted)]">
                                    Status
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--muted)]">
                                    Updated
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-[var(--muted)]">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                            {jobs.map((job) => (
                                <tr
                                    key={job.id}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                                >
                                    <td className="px-4 py-3">
                                        <div className="font-medium">
                                            {job.title || (
                                                <span className="text-[var(--muted)] italic">
                                                    No title
                                                </span>
                                            )}
                                        </div>
                                        {job.job_post_url && (
                                            <a
                                                href={job.job_post_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-[var(--primary)] hover:underline"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                View posting →
                                            </a>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {job.company_name || (
                                            <span className="text-[var(--muted)] italic">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(job.status)}`}
                                        >
                                            {job.status}
                                        </span>
                                        {/* Missing info badges */}
                                        {getMissingBadges(job).length > 0 && (
                                            <div className="flex gap-1 mt-1">
                                                {getMissingBadges(job).map((badge) => (
                                                    <Badge key={badge} variant="warning" size="sm">
                                                        {badge}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-[var(--muted)]">
                                        {formatRelativeTime(job.updated_at)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {/* AI Assist button - Sparkles */}
                                            <button
                                                className="p-1.5 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors text-purple-600 dark:text-purple-400"
                                                title="AI Assist"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setAiAssistJob(job);
                                                }}
                                            >
                                                <svg
                                                    className="w-4 h-4"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                                                    />
                                                </svg>
                                            </button>
                                            {/* Manual Edit button - Pencil */}
                                            <button
                                                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                                title="Edit"
                                                onClick={() => router.push(`/jobs/${job.id}`)}
                                            >
                                                <svg
                                                    className="w-4 h-4"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                    />
                                                </svg>
                                            </button>
                                            {/* Delete button */}
                                            <button
                                                className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-red-600 dark:text-red-400"
                                                title="Delete"
                                                onClick={() => setDeleteId(job.id)}
                                            >
                                                <svg
                                                    className="w-4 h-4"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                    />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Empty state */}
            {!loading && !error && jobs.length === 0 && (
                <div className="text-center py-12 border border-[var(--border)] rounded-lg">
                    <svg
                        className="mx-auto h-12 w-12 text-[var(--muted)]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium">No jobs tracked</h3>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                        {query || statusFilter
                            ? "No jobs match your filters."
                            : "Get started by adding a job application."}
                    </p>
                    {!query && !statusFilter && (
                        <div className="mt-6">
                            <Button onClick={() => setShowAddModal(true)}>+ Add Job</Button>
                        </div>
                    )}
                </div>
            )}

            {/* Add Job Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Add Job"
            >
                <form onSubmit={handleAddJob} className="space-y-4">
                    {formError && (
                        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 text-sm">
                            {formError}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-1">Title</label>
                        <Input
                            placeholder="e.g., Senior Software Engineer"
                            value={formData.title}
                            onChange={(e) =>
                                setFormData((d) => ({ ...d, title: e.target.value }))
                            }
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Company</label>
                        <Input
                            placeholder="e.g., Acme Corp"
                            value={formData.company_name}
                            onChange={(e) =>
                                setFormData((d) => ({ ...d, company_name: e.target.value }))
                            }
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Requisition ID
                        </label>
                        <Input
                            placeholder="e.g., REQ-12345"
                            value={formData.req_id}
                            onChange={(e) =>
                                setFormData((d) => ({ ...d, req_id: e.target.value }))
                            }
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Job Posting URL
                        </label>
                        <Input
                            type="url"
                            placeholder="https://..."
                            value={formData.job_post_url}
                            onChange={(e) =>
                                setFormData((d) => ({ ...d, job_post_url: e.target.value }))
                            }
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Apply URL</label>
                        <Input
                            type="url"
                            placeholder="https://..."
                            value={formData.apply_url}
                            onChange={(e) =>
                                setFormData((d) => ({ ...d, apply_url: e.target.value }))
                            }
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Recruiter Email
                        </label>
                        <Input
                            type="email"
                            placeholder="recruiter@company.com"
                            value={formData.recruiter_email}
                            onChange={(e) =>
                                setFormData((d) => ({ ...d, recruiter_email: e.target.value }))
                            }
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Status</label>
                        <Select
                            options={FORM_STATUS_OPTIONS}
                            value={formData.status}
                            onChange={(e) =>
                                setFormData((d) => ({
                                    ...d,
                                    status: e.target.value as JobStatus,
                                }))
                            }
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Notes</label>
                        <textarea
                            className="w-full h-24 px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-none"
                            placeholder="Any additional notes..."
                            value={formData.notes}
                            onChange={(e) =>
                                setFormData((d) => ({ ...d, notes: e.target.value }))
                            }
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setShowAddModal(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={formLoading}>
                            Add Job
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                title="Delete Job"
            >
                <p className="text-[var(--muted)]">
                    Are you sure you want to delete this job? This action cannot be
                    undone.
                </p>
                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="secondary" onClick={() => setDeleteId(null)}>
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleDelete}
                        isLoading={deleteLoading}
                    >
                        Delete
                    </Button>
                </div>
            </Modal>

            {/* AI Assist Modal */}
            {aiAssistJob && (
                <AiAssistModal
                    isOpen={!!aiAssistJob}
                    onClose={() => setAiAssistJob(null)}
                    job={aiAssistJob}
                    onApplied={() => {
                        setAiAssistJob(null);
                        fetchJobs();
                    }}
                />
            )}
        </div>
    );
}
