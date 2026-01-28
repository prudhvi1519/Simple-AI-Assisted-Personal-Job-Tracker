"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { Job } from "@/lib/supabase/client";

interface AiAssistModalProps {
    isOpen: boolean;
    onClose: () => void;
    job: Job;
    onApplied: () => void;
}

interface ExtractionResult {
    suggested: {
        title: string | null;
        companyName: string | null;
        reqId: string | null;
        jobPostUrl: string | null;
        applyUrl: string | null;
        recruiterEmails: string[];
        location: string | null;
        workMode: string | null;
        skills: string[];
        summary: string | null;
    };
    confidence: Record<string, number>;
    sources: Record<string, string>;
    warnings: string[];
}

type FieldKey =
    | "title"
    | "companyName"
    | "reqId"
    | "jobPostUrl"
    | "applyUrl"
    | "recruiterEmails"
    | "location"
    | "workMode"
    | "skills"
    | "summary";

const FIELD_LABELS: Record<FieldKey, string> = {
    title: "Job Title",
    companyName: "Company Name",
    reqId: "Requisition ID",
    jobPostUrl: "Job Post URL",
    applyUrl: "Apply URL",
    recruiterEmails: "Recruiter Emails",
    location: "Location",
    workMode: "Work Mode",
    skills: "Skills",
    summary: "Summary",
};

// Fields that map directly to job columns
const DIRECT_FIELDS: FieldKey[] = [
    "title",
    "companyName",
    "reqId",
    "jobPostUrl",
    "applyUrl",
    "recruiterEmails",
    "location",
    "workMode",
    "skills",
];

// Fields that go to notes
const NOTES_FIELDS: FieldKey[] = ["summary"];

export default function AiAssistModal({ isOpen, onClose, job, onApplied }: AiAssistModalProps) {
    // Input form state
    const [jobPostUrl, setJobPostUrl] = useState("");
    const [applyUrl, setApplyUrl] = useState("");
    const [reqId, setReqId] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [title, setTitle] = useState("");
    const [recruiterEmail, setRecruiterEmail] = useState("");
    const [pastedText, setPastedText] = useState("");

    // Extraction state
    const [extracting, setExtracting] = useState(false);
    const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
    const [extractError, setExtractError] = useState<string | null>(null);

    // Selection state
    const [selectedFields, setSelectedFields] = useState<Set<FieldKey>>(new Set());

    // Apply state
    const [applying, setApplying] = useState(false);

    // Initialize form with job data when modal opens
    useEffect(() => {
        if (isOpen && job) {
            setJobPostUrl(job.job_post_url || "");
            setApplyUrl(job.apply_url || "");
            setReqId(job.req_id || "");
            setCompanyName(job.company_name || "");
            setTitle(job.title || "");
            setRecruiterEmail(job.recruiter_emails?.[0] || "");
            setPastedText("");
            setExtractionResult(null);
            setExtractError(null);
            setSelectedFields(new Set());
        }
    }, [isOpen, job]);

    // Handle extraction
    const handleExtract = async () => {
        // Validate: at least one of pastedText, jobPostUrl, or applyUrl must be provided
        const hasInput = pastedText.trim() || jobPostUrl.trim() || applyUrl.trim();
        if (!hasInput) {
            setExtractError("Add JD text or a URL to extract from.");
            return;
        }

        setExtracting(true);
        setExtractError(null);
        setExtractionResult(null);

        try {
            const res = await fetch(`/api/jobs/${job.id}/ai-extract`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jobPostUrl: jobPostUrl || undefined,
                    applyUrl: applyUrl || undefined,
                    pastedText: pastedText || undefined,
                    title: title || undefined,
                    companyName: companyName || undefined,
                    reqId: reqId || undefined,
                    recruiterEmail: recruiterEmail || undefined,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Extraction failed");
            }

            const result: ExtractionResult = await res.json();
            setExtractionResult(result);

            // Auto-select fields with high confidence and non-empty values
            const autoSelected = new Set<FieldKey>();
            for (const field of [...DIRECT_FIELDS, ...NOTES_FIELDS]) {
                const value = result.suggested[field];
                const confidence = result.confidence[field] ?? 0;

                const hasValue =
                    value !== null &&
                    value !== undefined &&
                    (Array.isArray(value) ? value.length > 0 : value.toString().trim() !== "");

                if (hasValue && confidence >= 0.85) {
                    autoSelected.add(field);
                }
            }
            setSelectedFields(autoSelected);
        } catch (err) {
            setExtractError(err instanceof Error ? err.message : "Extraction failed");
        } finally {
            setExtracting(false);
        }
    };

    // Handle field selection toggle
    const toggleField = (field: FieldKey) => {
        setSelectedFields((prev) => {
            const next = new Set(prev);
            if (next.has(field)) {
                next.delete(field);
            } else {
                next.add(field);
            }
            return next;
        });
    };

    // Handle apply
    const handleApply = async () => {
        if (!extractionResult || selectedFields.size === 0) return;

        setApplying(true);

        try {
            // Build fields payload (direct columns only)
            const fields: Record<string, unknown> = {};
            for (const field of DIRECT_FIELDS) {
                if (selectedFields.has(field)) {
                    const value = extractionResult.suggested[field];
                    if (value !== null && value !== undefined) {
                        // Map camelCase to snake_case for API
                        const apiKey = field
                            .replace(/([A-Z])/g, "_$1")
                            .toLowerCase();
                        fields[apiKey] = value;
                    }
                }
            }

            // Build notes append (info fields only)
            const notesLines: string[] = [];
            for (const field of NOTES_FIELDS) {
                if (selectedFields.has(field)) {
                    const value = extractionResult.suggested[field];
                    if (value !== null && value !== undefined) {
                        if (field === "skills" && Array.isArray(value) && value.length > 0) {
                            notesLines.push(`Skills: ${value.join(", ")}`);
                        } else if (field === "location" && value) {
                            notesLines.push(`Location: ${value}`);
                        } else if (field === "workMode" && value) {
                            notesLines.push(`Work Mode: ${value}`);
                        } else if (field === "summary" && value) {
                            notesLines.push(`Summary: ${value}`);
                        }
                    }
                }
            }

            const notesAppend = notesLines.length > 0 ? notesLines.join("\n") : undefined;

            // Call apply endpoint
            const res = await fetch(`/api/jobs/${job.id}/ai-apply`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fields: Object.keys(fields).length > 0 ? fields : undefined,
                    notesAppend,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Apply failed");
            }

            onApplied();
            onClose();
        } catch (err) {
            setExtractError(err instanceof Error ? err.message : "Apply failed");
        } finally {
            setApplying(false);
        }
    };

    // Get confidence badge variant
    const getConfidenceBadge = (confidence: number | undefined) => {
        if (confidence === undefined) return null;
        if (confidence >= 0.85) {
            return <Badge variant="success" size="sm">{Math.round(confidence * 100)}%</Badge>;
        }
        if (confidence >= 0.6) {
            return <Badge variant="warning" size="sm">{Math.round(confidence * 100)}%</Badge>;
        }
        return <Badge variant="danger" size="sm">{Math.round(confidence * 100)}%</Badge>;
    };

    // Format value for display
    const formatValue = (field: FieldKey, value: unknown): string => {
        if (value === null || value === undefined) return "(empty)";
        if (Array.isArray(value)) {
            return value.length > 0 ? value.join(", ") : "(empty)";
        }
        const str = String(value).trim();
        return str || "(empty)";
    };

    // Get current value for comparison
    const getCurrentValue = (field: FieldKey): string => {
        switch (field) {
            case "title": return job.title || "";
            case "companyName": return job.company_name || "";
            case "reqId": return job.req_id || "";
            case "jobPostUrl": return job.job_post_url || "";
            case "applyUrl": return job.apply_url || "";
            case "recruiterEmails":
                return job.recruiter_emails && job.recruiter_emails.length > 0
                    ? job.recruiter_emails.join(", ")
                    : "";
            case "location": return job.location || "";
            case "workMode": return job.work_mode || "";
            case "skills":
                const allSkills = [...(job.primary_skills || []), ...(job.secondary_skills || [])];
                return allSkills.length > 0 ? allSkills.join(", ") : "";
            default: return ""; // Notes fields don't overwrite
        }
    };

    // Toggle all fields
    const toggleAll = () => {
        if (!extractionResult) return;

        // If all available are selected, deselect all. Otherwise select all available.
        const availableFields = [...DIRECT_FIELDS, ...NOTES_FIELDS].filter(field => {
            const value = extractionResult.suggested[field];
            const str = formatValue(field, value);
            return str !== "(empty)";
        });

        const allSelected = availableFields.every(f => selectedFields.has(f));

        if (allSelected) {
            setSelectedFields(new Set());
        } else {
            setSelectedFields(new Set(availableFields));
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="AI Assist - Extract Job Info">
            <div className="space-y-4">
                {/* Input Form */}
                {!extractionResult && (
                    <>
                        <p className="text-sm text-[var(--muted)]">
                            Provide a job description or URL to extract information automatically.
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium mb-1">Job Post URL</label>
                                <Input
                                    type="url"
                                    placeholder="https://..."
                                    value={jobPostUrl}
                                    onChange={(e) => setJobPostUrl(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Apply URL</label>
                                <Input
                                    type="url"
                                    placeholder="https://..."
                                    value={applyUrl}
                                    onChange={(e) => setApplyUrl(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium mb-1">Title (hint)</label>
                                <Input
                                    placeholder="e.g., Software Engineer"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Company (hint)</label>
                                <Input
                                    placeholder="e.g., Acme Corp"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium mb-1">Req ID (hint)</label>
                                <Input
                                    placeholder="e.g., REQ-12345"
                                    value={reqId}
                                    onChange={(e) => setReqId(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Recruiter Email (hint)</label>
                                <Input
                                    type="email"
                                    placeholder="recruiter@company.com"
                                    value={recruiterEmail}
                                    onChange={(e) => setRecruiterEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium mb-1">
                                Paste Job Description
                                <span className="font-normal text-[var(--muted)]"> (optional)</span>
                            </label>
                            <textarea
                                className="w-full h-40 px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-none"
                                placeholder="Paste the full job description here..."
                                value={pastedText}
                                onChange={(e) => setPastedText(e.target.value)}
                            />
                        </div>

                        {extractError && (
                            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 text-sm">
                                {extractError}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="secondary" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button onClick={handleExtract} isLoading={extracting}>
                                Extract with AI
                            </Button>
                        </div>
                    </>
                )}

                {/* Results View */}
                {extractionResult && (
                    <>
                        {/* Warnings */}
                        {extractionResult.warnings.length > 0 && (
                            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200 text-sm">
                                <strong>Warnings:</strong>
                                <ul className="list-disc list-inside mt-1">
                                    {extractionResult.warnings.map((w, i) => (
                                        <li key={i}>{w}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {extractError && (
                            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 text-sm">
                                {extractError}
                            </div>
                        )}

                        {/* Suggestions Table */}
                        <div className="border border-[var(--border)] rounded-lg overflow-hidden flex flex-col max-h-[60vh]">
                            <div className="overflow-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-3 py-2 text-left w-8 bg-gray-50 dark:bg-gray-900 border-b border-[var(--border)]">
                                                <input
                                                    type="checkbox"
                                                    onChange={toggleAll}
                                                    // Simple check: if at least one selected, show indeterminate or checked. 
                                                    // Ideally strict "all available" logic.
                                                    className="rounded border-gray-300 dark:border-gray-600"
                                                    title="Select All / None"
                                                />
                                            </th>
                                            <th className="px-3 py-2 text-left bg-gray-50 dark:bg-gray-900 border-b border-[var(--border)]">Field</th>
                                            <th className="px-3 py-2 text-left bg-gray-50 dark:bg-gray-900 border-b border-[var(--border)]">Current Value</th>
                                            <th className="px-3 py-2 text-left bg-gray-50 dark:bg-gray-900 border-b border-[var(--border)]">Suggested Value</th>
                                            <th className="px-3 py-2 text-center w-20 bg-gray-50 dark:bg-gray-900 border-b border-[var(--border)]">Conf.</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border)]">
                                        {[...DIRECT_FIELDS, ...NOTES_FIELDS].map((field) => {
                                            const value = extractionResult.suggested[field];
                                            const confidence = extractionResult.confidence[field];
                                            const displayValue = formatValue(field, value);
                                            const isEmpty = displayValue === "(empty)";
                                            const isNotesField = NOTES_FIELDS.includes(field);

                                            // Comparison Logic
                                            const currentVal = getCurrentValue(field);
                                            // Ideally we compare normalized strings, but raw compare is okay for now
                                            // For direct fields, check if different. For notes, always "Appends"

                                            let currentDisplay = currentVal || <span className="text-[var(--muted)] italic text-xs">(empty)</span>;
                                            if (isNotesField) currentDisplay = <span className="text-[var(--muted)] italic text-xs">(appends to notes)</span>;

                                            // Highlight if suggested is present AND different from current (for direct fields)
                                            // or just present (for notes fields)
                                            const isNew = !isEmpty && (isNotesField || (currentVal !== displayValue && value !== currentVal)); // loose check

                                            return (
                                                <tr
                                                    key={field}
                                                    className={`hover:bg-gray-50 dark:hover:bg-gray-900/50 ${isEmpty ? "opacity-50" : ""
                                                        }`}
                                                >
                                                    <td className="px-3 py-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedFields.has(field)}
                                                            onChange={() => toggleField(field)}
                                                            disabled={isEmpty}
                                                            className="rounded border-gray-300 dark:border-gray-600"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 font-medium">
                                                        {FIELD_LABELS[field]}
                                                        {/* Source could be small here if needed, but omitted for space */}
                                                    </td>
                                                    <td className="px-3 py-2 max-w-[150px] truncate text-[var(--muted)]" title={typeof currentVal === 'string' ? currentVal : ''}>
                                                        {currentDisplay}
                                                    </td>
                                                    <td className="px-3 py-2 max-w-[200px]" title={displayValue}>
                                                        {isEmpty ? (
                                                            <span className="text-[var(--muted)] italic text-xs">(no suggestion)</span>
                                                        ) : (
                                                            <span className={isNew ? "text-green-600 dark:text-green-400 font-medium" : ""}>
                                                                {displayValue}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        {getConfidenceBadge(confidence)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-4">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setExtractionResult(null);
                                    setSelectedFields(new Set());
                                }}
                            >
                                ← Re-extract
                            </Button>
                            <div className="flex gap-3">
                                <Button variant="secondary" onClick={onClose}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleApply}
                                    isLoading={applying}
                                    disabled={selectedFields.size === 0}
                                >
                                    Apply {selectedFields.size} field{selectedFields.size !== 1 ? "s" : ""}
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
