"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import Badge from "@/components/ui/Badge";
import AiAssistModal from "@/components/jobs/AiAssistModal";
import { Job, JOB_STATUSES, JobStatus, WORK_MODES, PRIORITIES, WorkMode, Priority } from "@/lib/supabase/client";
import JobDetailsPanel from "@/components/jobs/JobDetailsPanel";
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

// Parse comma-separated skills into array (trim, dedupe, limit)
function parseSkills(input: string, maxCount: number = 10): string[] {
    if (!input.trim()) return [];
    const skills = input
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    const uniqueSkills = [...new Set(skills)];
    return uniqueSkills.slice(0, maxCount);
}

// Format location helper
function formatLocation(job: Job) {
    if (job.work_mode && job.location) return `${job.work_mode} • ${job.location}`;
    if (job.work_mode) return job.work_mode;
    if (job.location) return job.location;
    return "—";
}

// Dropdown options for new fields
const WORK_MODE_OPTIONS = [
    { value: "", label: "Select..." },
    ...WORK_MODES.map((m) => ({ value: m, label: m })),
];

const PRIORITY_OPTIONS = [
    { value: "", label: "Select..." },
    ...PRIORITIES.map((p) => ({ value: p, label: p })),
];

// Default form state
const DEFAULT_FORM_DATA = {
    title: "",
    company_name: "",
    req_id: "",
    job_post_url: "",
    apply_url: "",
    recruiter_email: "",
    recruiter_name: "",
    notes: "",
    status: "Saved" as JobStatus,
    source: "",
    priority: "" as Priority | "",
    location: "",
    work_mode: "" as WorkMode | "",
    compensation_text: "",
    next_followup_at: "",
    primary_skills: "",
    secondary_skills: "",
};

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
    const [priorityFilter, setPriorityFilter] = useState("");
    const [workModeFilter, setWorkModeFilter] = useState("");

    // Selection
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

    // Add Job Modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [formData, setFormData] = useState({ ...DEFAULT_FORM_DATA });
    const [showMoreDetails, setShowMoreDetails] = useState(false);

    // Resume upload state (optional)
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [uploadingResume, setUploadingResume] = useState(false);
    const [resumeUploadError, setResumeUploadError] = useState<string | null>(null);
    const [resumeUploadSuccess, setResumeUploadSuccess] = useState(false);
    const [createdJobId, setCreatedJobId] = useState<string | null>(null);
    const resumeInputRef = useRef<HTMLInputElement>(null);

    // Delete confirmation
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // AI Assist modal
    const [aiAssistJob, setAiAssistJob] = useState<Job | null>(null);

    // Add Job AI Assist state
    const [addJobTab, setAddJobTab] = useState<"manual" | "ai">("manual");
    const [aiJdText, setAiJdText] = useState("");
    const [aiExtracting, setAiExtracting] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [aiCooldownUntil, setAiCooldownUntil] = useState<number | null>(null);
    const [aiSecondsRemaining, setAiSecondsRemaining] = useState(0);
    const [aiResult, setAiResult] = useState<{
        title?: string | null;
        companyName?: string | null;
        reqId?: string | null;
        jobPostUrl?: string | null;
        applyUrl?: string | null;
        recruiterEmails?: string[];
        location?: string | null;
        workMode?: string | null;
        skills?: string[];
        summary?: string | null;
    } | null>(null);
    const [aiSelectedFields, setAiSelectedFields] = useState<Set<string>>(new Set());

    // Fetch jobs
    const fetchJobs = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams();
            if (query) params.set("query", query);
            if (statusFilter) params.set("status", statusFilter);
            if (priorityFilter) params.set("priority", priorityFilter);
            if (workModeFilter) params.set("work_mode", workModeFilter);

            const res = await fetch(`/api/jobs?${params.toString()}`);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to fetch jobs");
            }

            const data = await res.json();

            // Defensive parsing
            const items = Array.isArray(data?.items) ? data.items : [];
            const count = typeof data?.total === 'number' ? data.total : items.length;

            setJobs(items);
            setTotal(count);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    }, [query, statusFilter, priorityFilter, workModeFilter]);

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

    // AI Cooldown Timer Effect
    useEffect(() => {
        if (!aiCooldownUntil) {
            setAiSecondsRemaining(0);
            return;
        }

        const tick = () => {
            const now = Date.now();
            const remain = Math.ceil((aiCooldownUntil - now) / 1000);
            if (remain <= 0) {
                setAiCooldownUntil(null);
                setAiSecondsRemaining(0);
            } else {
                setAiSecondsRemaining(remain);
            }
        };

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [aiCooldownUntil]);

    // Handle AI extraction for Add Job
    const handleAiExtract = async () => {
        if (aiExtracting || aiCooldownUntil) return;
        if (!aiJdText.trim()) {
            setAiError("Please paste job description text to extract from.");
            return;
        }

        setAiExtracting(true);
        setAiError(null);

        try {
            const res = await fetch("/api/ai/job-extract", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: aiJdText }),
            });

            const data = await res.json();

            if (res.status === 429) {
                const retrySeconds = data.retryAfterSeconds || 60;
                setAiCooldownUntil(Date.now() + retrySeconds * 1000);
                setAiError(`Rate limited. Please wait ${retrySeconds} seconds.`);
                return;
            }

            if (!res.ok || !data.ok) {
                throw new Error(data.error || "Extraction failed");
            }

            // Store result and select all non-null fields by default
            const extracted = data.data;
            setAiResult(extracted);

            const defaultSelected = new Set<string>();
            if (extracted.title) defaultSelected.add("title");
            if (extracted.companyName) defaultSelected.add("companyName");
            if (extracted.reqId) defaultSelected.add("reqId");
            if (extracted.jobPostUrl) defaultSelected.add("jobPostUrl");
            if (extracted.applyUrl) defaultSelected.add("applyUrl");
            if (extracted.recruiterEmails?.length) defaultSelected.add("recruiterEmails");
            if (extracted.location) defaultSelected.add("location");
            if (extracted.workMode) defaultSelected.add("workMode");
            if (extracted.skills?.length) defaultSelected.add("skills");
            if (extracted.summary) defaultSelected.add("summary");
            setAiSelectedFields(defaultSelected);
        } catch (err) {
            setAiError(err instanceof Error ? err.message : "Extraction failed");
        } finally {
            setAiExtracting(false);
        }
    };

    // Apply selected AI fields to form
    const handleApplyAiFields = () => {
        if (!aiResult) return;

        setFormData((d) => ({
            ...d,
            title: aiSelectedFields.has("title") && aiResult.title ? aiResult.title : d.title,
            company_name: aiSelectedFields.has("companyName") && aiResult.companyName ? aiResult.companyName : d.company_name,
            req_id: aiSelectedFields.has("reqId") && aiResult.reqId ? aiResult.reqId : d.req_id,
            job_post_url: aiSelectedFields.has("jobPostUrl") && aiResult.jobPostUrl ? aiResult.jobPostUrl : d.job_post_url,
            apply_url: aiSelectedFields.has("applyUrl") && aiResult.applyUrl ? aiResult.applyUrl : d.apply_url,
            recruiter_email: aiSelectedFields.has("recruiterEmails") && aiResult.recruiterEmails?.[0] ? aiResult.recruiterEmails[0] : d.recruiter_email,
            location: aiSelectedFields.has("location") && aiResult.location ? aiResult.location : d.location,
            work_mode: aiSelectedFields.has("workMode") && aiResult.workMode ? aiResult.workMode as WorkMode : d.work_mode,
            primary_skills: aiSelectedFields.has("skills") && aiResult.skills?.length ? aiResult.skills.join(", ") : d.primary_skills,
            notes: aiSelectedFields.has("summary") && aiResult.summary ? (d.notes ? d.notes + "\n\n" + aiResult.summary : aiResult.summary) : d.notes,
        }));

        // Switch to manual tab to show applied values
        setAddJobTab("manual");
        setAiResult(null);
        setAiSelectedFields(new Set());
    };

    // Handle add job (two-step: create job, then upload resume if selected)
    const handleAddJob = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError(null);
        setResumeUploadError(null);
        setResumeUploadSuccess(false);

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
                recruiter_name: formData.recruiter_name || undefined,
                notes: formData.notes || undefined,
                status: formData.status,
                // New fields
                source: formData.source || undefined,
                priority: formData.priority || undefined,
                location: formData.location || undefined,
                work_mode: formData.work_mode || undefined,
                compensation_text: formData.compensation_text || undefined,
                next_followup_at: formData.next_followup_at || undefined,
                primary_skills: parseSkills(formData.primary_skills, 10),
                secondary_skills: parseSkills(formData.secondary_skills, 20),
            };

            // Step 1: Create job
            const res = await fetch("/api/jobs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to create job");
            }

            const newJob = await res.json();

            // Step 2: Upload resume if selected (non-blocking on failure)
            if (resumeFile) {
                setUploadingResume(true);
                try {
                    const uploadData = new FormData();
                    uploadData.append("file", resumeFile);
                    uploadData.append("fileType", "resume");

                    const uploadRes = await fetch(`/api/jobs/${newJob.id}/files`, {
                        method: "POST",
                        body: uploadData,
                    });

                    if (!uploadRes.ok) {
                        const uploadErr = await uploadRes.json();
                        setResumeUploadError(uploadErr.error || "Resume upload failed");
                        setCreatedJobId(newJob.id); // Save for retry
                        setFormLoading(false);
                        setUploadingResume(false);
                        return; // Keep modal open for retry
                    } else {
                        setResumeUploadSuccess(true);
                    }
                } catch {
                    setResumeUploadError("Resume upload failed");
                    setCreatedJobId(newJob.id); // Save for retry
                    setFormLoading(false);
                    setUploadingResume(false);
                    return; // Keep modal open for retry
                } finally {
                    setUploadingResume(false);
                }
            }

            // Reset form and close modal
            setFormData({ ...DEFAULT_FORM_DATA });
            setShowMoreDetails(false);
            setResumeFile(null);
            setCreatedJobId(null);
            if (resumeInputRef.current) {
                resumeInputRef.current.value = "";
            }
            setShowAddModal(false);
            fetchJobs();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setFormLoading(false);
        }
    };

    // Handle retry resume upload (only re-upload, don't recreate job)
    const handleRetryResumeUpload = async () => {
        if (!createdJobId || !resumeFile) return;

        setUploadingResume(true);
        setResumeUploadError(null);

        try {
            const uploadData = new FormData();
            uploadData.append("file", resumeFile);
            uploadData.append("fileType", "resume");

            const uploadRes = await fetch(`/api/jobs/${createdJobId}/files`, {
                method: "POST",
                body: uploadData,
            });

            if (!uploadRes.ok) {
                const uploadErr = await uploadRes.json();
                setResumeUploadError(uploadErr.error || "Resume upload failed");
                return;
            }

            setResumeUploadSuccess(true);

            // Success - close modal and refresh
            setTimeout(() => {
                setFormData({ ...DEFAULT_FORM_DATA });
                setShowMoreDetails(false);
                setResumeFile(null);
                setCreatedJobId(null);
                setResumeUploadSuccess(false);
                if (resumeInputRef.current) {
                    resumeInputRef.current.value = "";
                }
                setShowAddModal(false);
                fetchJobs();
            }, 1000); // Brief delay to show success message
        } catch {
            setResumeUploadError("Resume upload failed");
        } finally {
            setUploadingResume(false);
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
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <Input
                        placeholder="Search jobs..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                    <div className="w-36 flex-shrink-0">
                        <Select
                            options={STATUS_OPTIONS}
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        />
                    </div>
                    <div className="w-36 flex-shrink-0">
                        <Select
                            options={[
                                { value: "", label: "All Priorities" },
                                ...PRIORITIES.map(p => ({ value: p, label: p }))
                            ]}
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                        />
                    </div>
                    <div className="w-36 flex-shrink-0">
                        <Select
                            options={[
                                { value: "", label: "All Work Modes" },
                                ...WORK_MODES.map(m => ({ value: m, label: m }))
                            ]}
                            value={workModeFilter}
                            onChange={(e) => setWorkModeFilter(e.target.value)}
                        />
                    </div>
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

            {/* Jobs Content (Full Width Table) */}
            {!loading && !error && jobs.length > 0 && (
                <div className="h-[calc(100vh-250px)]">
                    {/* Table Container */}
                    <div className="h-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)] flex flex-col">
                        <div className="overflow-auto flex-1">
                            <table className="w-full relative border-collapse">
                                <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-[var(--muted)]">Title</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-[var(--muted)]">Company</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-[var(--muted)]">Status</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-[var(--muted)] hidden lg:table-cell">Priority</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-[var(--muted)] hidden md:table-cell">Location</th>
                                        <th className="px-4 py-3 text-center text-sm font-medium text-[var(--muted)]">Resume</th>
                                        <th className="px-4 py-3 text-right text-sm font-medium text-[var(--muted)]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border)]">
                                    {jobs.map((job) => {
                                        const isSelected = selectedJobId === job.id;
                                        return (
                                            <tr
                                                key={job.id}
                                                className={`cursor-pointer transition-colors relative group
                                                    ${isSelected
                                                        ? "bg-blue-50 dark:bg-blue-900/10 border-l-4 border-l-blue-500"
                                                        : "hover:bg-gray-50 dark:hover:bg-gray-900/50 border-l-4 border-l-transparent"
                                                    }`}
                                                tabIndex={0}
                                                onClick={() => setSelectedJobId(job.id)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        setSelectedJobId(job.id);
                                                    }
                                                }}
                                            >
                                                {/* Title */}
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-sm text-[var(--foreground)]">
                                                        {job.title || <span className="text-[var(--muted)] italic">Untitled</span>}
                                                    </div>
                                                </td>

                                                {/* Company */}
                                                <td className="px-4 py-3 text-sm">
                                                    {job.company_name || <span className="text-[var(--muted)] italic">—</span>}
                                                </td>

                                                {/* Status */}
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(job.status)}`}>
                                                        {job.status}
                                                    </span>
                                                </td>

                                                {/* Priority */}
                                                <td className="px-4 py-3 hidden lg:table-cell">
                                                    {job.priority && (
                                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${job.priority === 'High' ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20' :
                                                            job.priority === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-100 dark:bg-yellow-900/20' :
                                                                'bg-gray-50 text-gray-600 border-gray-100 dark:bg-gray-800'
                                                            }`}>
                                                            {job.priority}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Location */}
                                                <td className="px-4 py-3 text-sm text-[var(--muted)] hidden md:table-cell">
                                                    {formatLocation(job)}
                                                </td>

                                                {/* Resume */}
                                                <td className="px-4 py-3 text-center">
                                                    {job.hasResume && job.resumeFileId ? (
                                                        <a
                                                            href={`/api/files/${job.resumeFileId}`}
                                                            download
                                                            className="inline-flex items-center justify-center p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                                            title="Download Resume"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                            </svg>
                                                        </a>
                                                    ) : (
                                                        <span className="text-[var(--muted)] text-xs">—</span>
                                                    )}
                                                </td>

                                                {/* Actions */}
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            className="p-1.5 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors text-purple-600 dark:text-purple-400"
                                                            title="AI Assist"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setAiAssistJob(job);
                                                            }}
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                                            title="Edit"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                router.push(`/jobs/${job.id}`);
                                                            }}
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-red-600 dark:text-red-400"
                                                            title="Delete"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDeleteId(job.id);
                                                            }}
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>

                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Job Details Modal (All Screen Sizes) */}
            <Modal
                isOpen={!!selectedJobId}
                onClose={() => setSelectedJobId(null)}
                title="Job Details"
            >
                {selectedJobId && (
                    <div className="h-[70vh] -mx-6 -my-4">
                        <JobDetailsPanel
                            jobId={selectedJobId}
                            onClose={() => setSelectedJobId(null)}
                            onEdit={() => {
                                setSelectedJobId(null);
                                router.push(`/jobs/${selectedJobId}`);
                            }}
                            onAiAssist={(job) => {
                                setSelectedJobId(null);
                                setAiAssistJob(job);
                            }}
                        />
                    </div>
                )}
            </Modal>
            {/* Mobile View: Cards */}
            {!loading && !error && jobs.length > 0 && (
                <div className="md:hidden space-y-4">
                    {jobs.map((job) => (
                        <div
                            key={job.id}
                            className="bg-[var(--background)] p-4 rounded-lg border border-[var(--border)] shadow-sm space-y-3"
                        >
                            <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0">
                                    <div className="font-semibold truncate">
                                        {job.title || (
                                            <span className="text-[var(--muted)] italic">
                                                No title
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-sm text-[var(--muted)] truncate">
                                        {job.company_name || "—"}
                                    </div>
                                </div>
                                <span
                                    className={`flex-shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
                                        job.status
                                    )}`}
                                >
                                    {job.status}
                                </span>
                            </div>

                            {/* Missing info badges */}
                            {getMissingBadges(job).length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {getMissingBadges(job).map((badge) => (
                                        <Badge key={badge} variant="warning" size="sm">
                                            {badge}
                                        </Badge>
                                    ))}
                                </div>
                            )}

                            {/* Priority (Mobile) */}
                            {job.priority && (
                                <div className="flex">
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${job.priority === 'High' ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/30' :
                                        job.priority === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-900/30' :
                                            'bg-gray-50 text-gray-600 border-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                                        }`}>
                                        {job.priority} Priority
                                    </span>
                                </div>
                            )}

                            {/* Skills chips (top 2 primary) */}
                            {job.primary_skills && job.primary_skills.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {job.primary_skills.slice(0, 2).map((skill) => (
                                        <span
                                            key={skill}
                                            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                    {job.primary_skills.length > 2 && (
                                        <span className="text-xs text-[var(--muted)]">
                                            +{job.primary_skills.length - 2}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Next follow-up */}
                            {job.next_followup_at && (
                                <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Follow-up: {new Date(job.next_followup_at).toLocaleDateString()}
                                </div>
                            )}

                            <div className="text-xs text-[var(--muted)] flex justify-between items-center">
                                <span>Updated {formatRelativeTime(job.updated_at)}</span>
                                {job.job_post_url && (
                                    <a
                                        href={job.job_post_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[var(--primary)] hover:underline"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        View posting →
                                    </a>
                                )}
                            </div>

                            {/* Actions Row */}
                            <div className="pt-3 border-t border-[var(--border)] flex justify-end gap-3">
                                {/* AI Assist button - Sparkles */}
                                <button
                                    className="p-2 rounded-md bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
                                    title="AI Assist"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setAiAssistJob(job);
                                    }}
                                >
                                    <svg
                                        className="w-5 h-5"
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
                                    className="p-2 rounded-md bg-gray-100 dark:bg-gray-800"
                                    title="Edit"
                                    onClick={() => router.push(`/jobs/${job.id}`)}
                                >
                                    <svg
                                        className="w-5 h-5"
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
                                    className="p-2 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                                    title="Delete"
                                    onClick={() => setDeleteId(job.id)}
                                >
                                    <svg
                                        className="w-5 h-5"
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
                        </div>
                    ))}
                </div>
            )}

            {/* Empty state */}
            {
                !loading && !error && jobs.length === 0 && (
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
                )
            }

            {/* Add Job Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => {
                    setShowAddModal(false);
                    setAddJobTab("manual");
                    setAiJdText("");
                    setAiResult(null);
                    setAiError(null);
                }}
                title="Add Job"
            >
                {/* Tab Toggle */}
                <div className="flex gap-2 mb-4 border-b border-[var(--border)]">
                    <button
                        type="button"
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${addJobTab === "manual"
                            ? "border-[var(--primary)] text-[var(--primary)]"
                            : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                            }`}
                        onClick={() => setAddJobTab("manual")}
                    >
                        Manual Entry
                    </button>
                    <button
                        type="button"
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${addJobTab === "ai"
                            ? "border-purple-500 text-purple-600 dark:text-purple-400"
                            : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                            }`}
                        onClick={() => setAddJobTab("ai")}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        AI Assist
                    </button>
                </div>

                {/* AI Assist Tab Content */}
                {addJobTab === "ai" && (
                    <div className="space-y-4">
                        {/* Cooldown Warning */}
                        {aiCooldownUntil && aiSecondsRemaining > 0 && (
                            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 text-sm">
                                ⏳ Rate limited. Please wait {aiSecondsRemaining}s before trying again.
                            </div>
                        )}

                        {/* Error */}
                        {aiError && !aiCooldownUntil && (
                            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 text-sm">
                                {aiError}
                            </div>
                        )}

                        {/* Input Area */}
                        {!aiResult && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        Paste Job Description
                                    </label>
                                    <textarea
                                        className="w-full h-40 px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                                        placeholder="Paste the full job description text here..."
                                        value={aiJdText}
                                        onChange={(e) => setAiJdText(e.target.value)}
                                    />
                                    <p className="text-xs text-[var(--muted)] mt-1">
                                        AI will extract: title, company, location, skills, and more
                                    </p>
                                </div>

                                <div className="flex justify-end">
                                    <Button
                                        type="button"
                                        onClick={handleAiExtract}
                                        disabled={aiExtracting || !aiJdText.trim() || !!aiCooldownUntil}
                                        className="bg-purple-600 hover:bg-purple-700 text-white"
                                    >
                                        {aiExtracting ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                Extracting...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                                </svg>
                                                Extract with AI
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </>
                        )}

                        {/* Extraction Results */}
                        {aiResult && (
                            <div className="space-y-4">
                                <div className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-1.5">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Extraction complete! Select fields to apply:
                                </div>

                                <div className="max-h-64 overflow-y-auto border border-[var(--border)] rounded-lg divide-y divide-[var(--border)]">
                                    {/* Title */}
                                    {aiResult.title && (
                                        <label className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={aiSelectedFields.has("title")}
                                                onChange={(e) => {
                                                    const next = new Set(aiSelectedFields);
                                                    e.target.checked ? next.add("title") : next.delete("title");
                                                    setAiSelectedFields(next);
                                                }}
                                                className="rounded"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs text-[var(--muted)]">Title</div>
                                                <div className="text-sm truncate">{aiResult.title}</div>
                                            </div>
                                        </label>
                                    )}

                                    {/* Company */}
                                    {aiResult.companyName && (
                                        <label className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={aiSelectedFields.has("companyName")}
                                                onChange={(e) => {
                                                    const next = new Set(aiSelectedFields);
                                                    e.target.checked ? next.add("companyName") : next.delete("companyName");
                                                    setAiSelectedFields(next);
                                                }}
                                                className="rounded"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs text-[var(--muted)]">Company</div>
                                                <div className="text-sm truncate">{aiResult.companyName}</div>
                                            </div>
                                        </label>
                                    )}

                                    {/* Location */}
                                    {aiResult.location && (
                                        <label className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={aiSelectedFields.has("location")}
                                                onChange={(e) => {
                                                    const next = new Set(aiSelectedFields);
                                                    e.target.checked ? next.add("location") : next.delete("location");
                                                    setAiSelectedFields(next);
                                                }}
                                                className="rounded"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs text-[var(--muted)]">Location</div>
                                                <div className="text-sm truncate">{aiResult.location}</div>
                                            </div>
                                        </label>
                                    )}

                                    {/* Work Mode */}
                                    {aiResult.workMode && (
                                        <label className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={aiSelectedFields.has("workMode")}
                                                onChange={(e) => {
                                                    const next = new Set(aiSelectedFields);
                                                    e.target.checked ? next.add("workMode") : next.delete("workMode");
                                                    setAiSelectedFields(next);
                                                }}
                                                className="rounded"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs text-[var(--muted)]">Work Mode</div>
                                                <div className="text-sm truncate">{aiResult.workMode}</div>
                                            </div>
                                        </label>
                                    )}

                                    {/* Skills */}
                                    {aiResult.skills && aiResult.skills.length > 0 && (
                                        <label className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={aiSelectedFields.has("skills")}
                                                onChange={(e) => {
                                                    const next = new Set(aiSelectedFields);
                                                    e.target.checked ? next.add("skills") : next.delete("skills");
                                                    setAiSelectedFields(next);
                                                }}
                                                className="rounded"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs text-[var(--muted)]">Skills</div>
                                                <div className="text-sm truncate">{aiResult.skills.join(", ")}</div>
                                            </div>
                                        </label>
                                    )}

                                    {/* Summary */}
                                    {aiResult.summary && (
                                        <label className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={aiSelectedFields.has("summary")}
                                                onChange={(e) => {
                                                    const next = new Set(aiSelectedFields);
                                                    e.target.checked ? next.add("summary") : next.delete("summary");
                                                    setAiSelectedFields(next);
                                                }}
                                                className="rounded"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs text-[var(--muted)]">Summary (→ Notes)</div>
                                                <div className="text-sm line-clamp-2">{aiResult.summary}</div>
                                            </div>
                                        </label>
                                    )}
                                </div>

                                <div className="flex justify-between gap-3">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => {
                                            setAiResult(null);
                                            setAiSelectedFields(new Set());
                                        }}
                                    >
                                        ← Back
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={handleApplyAiFields}
                                        disabled={aiSelectedFields.size === 0}
                                        className="bg-purple-600 hover:bg-purple-700 text-white"
                                    >
                                        Apply {aiSelectedFields.size} Field{aiSelectedFields.size !== 1 ? "s" : ""}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Manual Entry Tab Content */}
                {addJobTab === "manual" && (
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

                        {/* More Details Accordion */}
                        <div className="border-t border-[var(--border)] pt-2">
                            <button
                                type="button"
                                className="flex items-center justify-between w-full text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                                onClick={() => setShowMoreDetails(!showMoreDetails)}
                            >
                                <span>More details (optional)</span>
                                <svg
                                    className={`w-4 h-4 transition-transform ${showMoreDetails ? "rotate-180" : ""}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {showMoreDetails && (
                                <div className="mt-3 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Recruiter Name</label>
                                            <Input
                                                placeholder="John Doe"
                                                value={formData.recruiter_name}
                                                onChange={(e) =>
                                                    setFormData((d) => ({ ...d, recruiter_name: e.target.value }))
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Source</label>
                                            <Input
                                                placeholder="LinkedIn, Referral..."
                                                value={formData.source}
                                                onChange={(e) =>
                                                    setFormData((d) => ({ ...d, source: e.target.value }))
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Priority</label>
                                            <Select
                                                options={PRIORITY_OPTIONS}
                                                value={formData.priority}
                                                onChange={(e) =>
                                                    setFormData((d) => ({ ...d, priority: e.target.value as Priority | "" }))
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Work Mode</label>
                                            <Select
                                                options={WORK_MODE_OPTIONS}
                                                value={formData.work_mode}
                                                onChange={(e) =>
                                                    setFormData((d) => ({ ...d, work_mode: e.target.value as WorkMode | "" }))
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Location</label>
                                            <Input
                                                placeholder="San Francisco, CA"
                                                value={formData.location}
                                                onChange={(e) =>
                                                    setFormData((d) => ({ ...d, location: e.target.value }))
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Compensation</label>
                                            <Input
                                                placeholder="$150k-180k"
                                                value={formData.compensation_text}
                                                onChange={(e) =>
                                                    setFormData((d) => ({ ...d, compensation_text: e.target.value }))
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Next Follow-up</label>
                                        <Input
                                            type="datetime-local"
                                            value={formData.next_followup_at}
                                            onChange={(e) =>
                                                setFormData((d) => ({ ...d, next_followup_at: e.target.value }))
                                            }
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            Primary Skills{" "}
                                            <span className="font-normal text-[var(--muted)]">(comma-separated, max 10)</span>
                                        </label>
                                        <Input
                                            placeholder="React, TypeScript, Node.js"
                                            value={formData.primary_skills}
                                            onChange={(e) =>
                                                setFormData((d) => ({ ...d, primary_skills: e.target.value }))
                                            }
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            Secondary Skills{" "}
                                            <span className="font-normal text-[var(--muted)]">(nice-to-have, max 20)</span>
                                        </label>
                                        <Input
                                            placeholder="GraphQL, Docker, AWS"
                                            value={formData.secondary_skills}
                                            onChange={(e) =>
                                                setFormData((d) => ({ ...d, secondary_skills: e.target.value }))
                                            }
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Resume (optional) */}
                        <div className="pt-2 border-t border-[var(--border)]">
                            <label className="block text-sm font-medium mb-1">
                                Resume{" "}
                                <span className="font-normal text-[var(--muted)]">
                                    (optional)
                                </span>
                            </label>
                            <input
                                ref={resumeInputRef}
                                type="file"
                                accept=".pdf,.doc,.docx"
                                className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[var(--primary)] file:text-white hover:file:opacity-90 cursor-pointer"
                                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                            />
                            <p className="text-xs text-[var(--muted)] mt-1">
                                If uploaded with status &quot;Saved&quot;, status will change to &quot;Applied&quot;.
                            </p>
                            {resumeUploadSuccess && (
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Resume uploaded successfully!
                                </p>
                            )}
                            {resumeUploadError && (
                                <div className="mt-2 p-2 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                                    <p className="text-xs text-red-600 dark:text-red-400">
                                        Job created, but resume upload failed: {resumeUploadError}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleRetryResumeUpload}
                                        disabled={uploadingResume}
                                        className="mt-2 text-xs font-medium text-red-700 dark:text-red-300 hover:underline disabled:opacity-50 flex items-center gap-1"
                                    >
                                        {uploadingResume ? (
                                            <>
                                                <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                Retrying...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                Retry Upload
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setShowAddModal(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" isLoading={formLoading || uploadingResume}>
                                {uploadingResume ? "Uploading resume..." : formLoading ? "Saving..." : "Add Job"}
                            </Button>
                        </div>
                    </form>
                )}
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
            {
                aiAssistJob && (
                    <AiAssistModal
                        isOpen={!!aiAssistJob}
                        onClose={() => setAiAssistJob(null)}
                        job={aiAssistJob}
                        onApplied={() => {
                            setAiAssistJob(null);
                            fetchJobs();
                        }}
                    />
                )
            }
        </div >
    );
}
