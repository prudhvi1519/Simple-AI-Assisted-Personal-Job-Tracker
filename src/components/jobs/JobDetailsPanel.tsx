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

                {/* Location & Followup */}
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <div className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Location</div>
                        <div className="text-sm">{formatLocation(job)}</div>
                    </div>
                    {job.job_post_url && (
                        <div>
                            <div className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Link</div>
                            <a href={job.job_post_url} target="_blank" className="text-blue-600 hover:underline text-sm truncate block">
                                Open Job Post ↗
                            </a>
                        </div>
                    )}
                </div>

                {/* Resume */}
                <div>
                    <div className="text-xs text-[var(--muted)] uppercase tracking-wider mb-2">Resume</div>
                    {resumeFile ? (
                        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-100 dark:border-blue-900/30">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="text-sm text-blue-700 dark:text-blue-300 truncate">{resumeFile.original_name}</span>
                            </div>
                            <a
                                href={`/api/files/${resumeFile.id}`}
                                download
                                className="text-blue-600 hover:text-blue-800 p-1"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </a>
                        </div>
                    ) : (
                        <div className="text-sm text-[var(--muted)] italic">No resume attached</div>
                    )}
                </div>

                {/* Skills */}
                {job.primary_skills.length > 0 && (
                    <div>
                        <div className="text-xs text-[var(--muted)] uppercase tracking-wider mb-2">Skills</div>
                        <div className="flex flex-wrap gap-1">
                            {job.primary_skills.map(s => (
                                <span key={s} className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">{s}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Notes */}
                {job.notes && (
                    <div>
                        <div className="text-xs text-[var(--muted)] uppercase tracking-wider mb-2">Notes</div>
                        <div className="text-sm bg-gray-50 dark:bg-gray-900/50 p-3 rounded-md border border-gray-100 dark:border-gray-800 whitespace-pre-wrap">
                            {job.notes}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
