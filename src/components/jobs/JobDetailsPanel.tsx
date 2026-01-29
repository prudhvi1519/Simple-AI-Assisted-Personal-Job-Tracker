"use client";

import { useState, useEffect } from "react";
import { Job, JobFile, AiRun } from "@/lib/supabase/types";
import { formatRelativeTime } from "@/lib/utils/format";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import Button from "@/components/ui/Button";

interface JobDetailsPanelProps {
    jobId: string;
    onClose: () => void;
    onEdit: () => void;
    onAiAssist: (job: Job) => void;
}

export default function JobDetailsPanel({ jobId, onClose, onEdit, onAiAssist }: JobDetailsPanelProps) {
    const [job, setJob] = useState<Job | null>(null);
    const [files, setFiles] = useState<JobFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

    // Handle file delete
    const handleDeleteFile = async (fileId: string) => {
        if (!confirm("Are you sure you want to delete this file?")) return;
        setDeletingFileId(fileId);
        try {
            const res = await fetch(`/api/files/${fileId}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete file");
            // Remove from local state
            setFiles(prev => prev.filter(f => f.id !== fileId));
        } catch (err) {
            alert("Error deleting file");
        } finally {
            setDeletingFileId(null);
        }
    };

    useEffect(() => {
        let isMounted = true;
        const fetchDetails = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/jobs/${jobId}`);
                if (!res.ok) throw new Error("Failed to load details");
                const data = await res.json();
                if (isMounted) {
                    setJob(data.job);
                    setFiles(data.files || []);
                }
            } catch (err) {
                if (isMounted) setError("Could not load job details");
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        if (jobId) fetchDetails();
        return () => { isMounted = false; };
    }, [jobId]);

    if (loading) return <div className="p-8 text-center"><Spinner /></div>;
    if (error || !job) return <div className="p-8 text-center text-red-500">{error || "Job not found"}</div>;

    const resumeFile = files.find(f => f.file_type === 'resume');

    // Format location helper
    const formatLocation = (job: Job) => {
        if (job.work_mode && job.location) return `${job.work_mode} • ${job.location}`;
        if (job.work_mode) return job.work_mode;
        if (job.location) return job.location;
        return "—";
    };

    return (
        <div className="h-full flex flex-col bg-[var(--background)] border-l border-[var(--border)] overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-[var(--border)] flex justify-between items-start bg-gray-50 dark:bg-gray-900/50">
                <div>
                    <h2 className="text-xl font-bold">{job.title || "Untitled Job"}</h2>
                    <p className="text-[var(--muted)]">{job.company_name || "Unknown Company"}</p>
                </div>
                <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--foreground)]">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Content using exact columns/fields requested */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                <div className="text-xs text-[var(--muted)] uppercase tracking-wider font-semibold">
                    Saved Job Details
                </div>

                {/* Actions Bar */}
                <div className="flex gap-2">
                    <Button onClick={() => onEdit()} variant="secondary" className="flex-1">Edit</Button>
                    <Button onClick={() => onAiAssist(job)} variant="primary" className="flex-1">AI Assist</Button>
                </div>

                {/* Status & Priority */}
                <div className="grid grid-cols-2 gap-4 bg-[var(--card)] p-3 rounded-lg border border-[var(--border)]">
                    <div>
                        <div className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Status</div>
                        <Badge>{job.status}</Badge>
                    </div>
                    <div>
                        <div className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Priority</div>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${job.priority === 'High' ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20' :
                            job.priority === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-100 dark:bg-yellow-900/20' :
                                'bg-gray-50 text-gray-600 border-gray-100 dark:bg-gray-800'
                            }`}>
                            {job.priority || "None"}
                        </span>
                    </div>
                </div>

                {/* Main Info Grid */}
                <div className="grid grid-cols-1 gap-4">
                    {/* Location */}
                    <div>
                        <div className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Location</div>
                        <div className="text-sm">{formatLocation(job)}</div>
                    </div>

                    {/* Links */}
                    {(job.job_post_url || job.apply_url) && (
                        <div className="flex flex-col gap-1">
                            <div className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Links</div>
                            {job.job_post_url && (
                                <a href={job.job_post_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm truncate flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    Job Post
                                </a>
                            )}
                            {job.apply_url && (
                                <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm truncate flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    Application Page
                                </a>
                            )}
                        </div>
                    )}
                </div>

                {/* Recruiter & Compensation */}
                {(job.recruiter_name || (job.recruiter_emails && job.recruiter_emails.length > 0) || job.compensation_text) && (
                    <div className="grid grid-cols-1 gap-4 p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                        {(job.recruiter_name || (job.recruiter_emails && job.recruiter_emails.length > 0)) && (
                            <div>
                                <div className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Recruiter</div>
                                {job.recruiter_name && <div className="text-sm font-medium">{job.recruiter_name}</div>}
                                {job.recruiter_emails && job.recruiter_emails.map(email => (
                                    <div key={email} className="text-sm text-[var(--muted)]">{email}</div>
                                ))}
                            </div>
                        )}
                        {job.compensation_text && (
                            <div>
                                <div className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Compensation</div>
                                <div className="text-sm">{job.compensation_text}</div>
                            </div>
                        )}
                    </div>
                )}

                {/* Files List */}
                <div>
                    <div className="text-xs text-[var(--muted)] uppercase tracking-wider mb-2">Files ({files.length})</div>
                    {files.length > 0 ? (
                        <div className="space-y-2">
                            {files.map(file => (
                                <div key={file.id} className="flex items-center justify-between p-2 bg-[var(--card)] rounded border border-[var(--border)]">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        {file.file_type === 'resume' ? (
                                            <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        ) : (
                                            <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                        )}
                                        <div className="min-w-0">
                                            <div className="text-sm truncate" title={file.original_name}>{file.original_name}</div>
                                            <div className="text-xs text-[var(--muted)] uppercase">{file.file_type}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <a
                                            href={`/api/files/${file.id}`}
                                            download
                                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-blue-600"
                                            title="Download"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        </a>
                                        <button
                                            onClick={() => handleDeleteFile(file.id)}
                                            disabled={deletingFileId === file.id}
                                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-600"
                                            title="Delete"
                                        >
                                            {deletingFileId === file.id ? <Spinner size="sm" /> : (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-[var(--muted)] italic p-2 border border-dashed border-[var(--border)] rounded">
                            No files attached
                        </div>
                    )}
                </div>

                {/* Skills */}
                {job.primary_skills.length > 0 && (
                    <div>
                        <div className="text-xs text-[var(--muted)] uppercase tracking-wider mb-2">Skills</div>
                        <div className="flex flex-wrap gap-1">
                            {job.primary_skills.map(s => (
                                <span key={s} className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded text-xs">{s}</span>
                            ))}
                            {job.secondary_skills.map(s => (
                                <span key={s} className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-xs">{s}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Notes */}
                {job.notes && (
                    <div>
                        <div className="text-xs text-[var(--muted)] uppercase tracking-wider mb-2">Notes</div>
                        <div className="text-sm bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-md border border-yellow-100 dark:border-yellow-900/20 whitespace-pre-wrap text-[var(--foreground)]">
                            {job.notes}
                        </div>
                    </div>
                )}

                {/* Timestamps */}
                <div className="pt-4 border-t border-[var(--border)] grid grid-cols-2 gap-4 text-xs text-[var(--muted)]">
                    <div>
                        <div className="font-semibold mb-0.5">Created</div>
                        {new Date(job.created_at).toLocaleString()}
                    </div>
                    <div>
                        <div className="font-semibold mb-0.5">Updated</div>
                        {formatRelativeTime(job.updated_at)}
                    </div>
                </div>

            </div>
        </div>
    );
}
