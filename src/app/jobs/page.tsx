import Button from "@/components/ui/Button";

// Job status options
const JOB_STATUSES = [
    "Saved",
    "Applied",
    "Recruiter Screen",
    "Technical",
    "Final",
    "Offer",
    "Rejected",
    "Ghosted",
] as const;

// Placeholder job data
const PLACEHOLDER_JOBS = [
    {
        id: "1",
        company: "Acme Corp",
        role: "Senior Engineer",
        status: "Applied",
        url: "https://acme.com/careers/123",
        created_at: "2026-01-28",
    },
    {
        id: "2",
        company: "TechStart",
        role: "Full Stack Developer",
        status: "Saved",
        url: null,
        created_at: "2026-01-27",
    },
];

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

export default function JobsPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Jobs</h1>
                    <p className="text-[var(--muted)] text-sm">
                        Track your job applications
                    </p>
                </div>
                <Button>+ Add Job</Button>
            </div>

            {/* Jobs Table */}
            <div className="overflow-hidden rounded-lg border border-[var(--border)]">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--muted)]">
                                Company
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--muted)]">
                                Role
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--muted)]">
                                Status
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--muted)]">
                                Added
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-[var(--muted)]">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                        {PLACEHOLDER_JOBS.map((job) => (
                            <tr
                                key={job.id}
                                className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                            >
                                <td className="px-4 py-3">
                                    <div className="font-medium">{job.company}</div>
                                    {job.url && (
                                        <a
                                            href={job.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-[var(--primary)] hover:underline"
                                        >
                                            View posting →
                                        </a>
                                    )}
                                </td>
                                <td className="px-4 py-3">{job.role}</td>
                                <td className="px-4 py-3">
                                    <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(job.status)}`}
                                    >
                                        {job.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-[var(--muted)]">
                                    {job.created_at}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {/* AI Assist pencil icon - on every row */}
                                        <button
                                            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                            title="AI Assist"
                                        >
                                            <svg
                                                className="w-4 h-4 text-[var(--primary)]"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                                />
                                            </svg>
                                        </button>
                                        {/* Edit button */}
                                        <button
                                            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                            title="Edit"
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
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Empty state - shown when no jobs */}
            {PLACEHOLDER_JOBS.length === 0 && (
                <div className="text-center py-12">
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
                        Get started by adding a job application.
                    </p>
                    <div className="mt-6">
                        <Button>+ Add Job</Button>
                    </div>
                </div>
            )}
        </div>
    );
}
