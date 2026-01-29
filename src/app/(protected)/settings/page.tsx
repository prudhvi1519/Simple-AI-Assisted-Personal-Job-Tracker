"use client";

import Button from "@/components/ui/Button";

export default function SettingsPage() {
    // Handle downloads
    const handleDownload = (format: "csv" | "json") => {
        window.open(`/api/export/jobs.${format}`, "_blank");
    };

    return (
        <div className="max-w-2xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Settings</h1>
                <p className="text-[var(--muted)] text-sm">
                    Manage your data and preferences
                </p>
            </div>

            {/* System Health */}
            <div className="rounded-lg border border-[var(--border)] p-4 space-y-4">
                <h2 className="font-medium">System Health</h2>
                <p className="text-sm text-[var(--muted)]">
                    Verify connection to external services.
                </p>
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="secondary"
                        onClick={() => window.open('/api/health/env', '_blank')}
                        className="text-sm"
                    >
                        Check Env Vars
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => window.open('/api/health/storage', '_blank')}
                        className="text-sm"
                    >
                        Check Storage
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => window.open('/api/health/ai-runs', '_blank')}
                        className="text-sm"
                    >
                        Check AI Database
                    </Button>
                </div>
            </div>

            {/* Export section */}
            <div className="rounded-lg border border-[var(--border)] p-4 space-y-4">
                <h2 className="font-medium">Export Data</h2>
                <p className="text-sm text-[var(--muted)]">
                    Download all your job application data for backup or analysis.
                </p>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={() => handleDownload("csv")}>
                        Export as CSV
                    </Button>
                    <Button variant="secondary" onClick={() => handleDownload("json")}>
                        Export as JSON
                    </Button>
                </div>
            </div>

            {/* Danger zone */}
            <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 p-4 space-y-4">
                <h2 className="font-medium text-red-800 dark:text-red-200">
                    Danger Zone
                </h2>
                <p className="text-sm text-red-600 dark:text-red-400">
                    Permanently delete all your data. This action cannot be undone.
                </p>
                <Button variant="danger" title="Coming soon" disabled>Delete All Data</Button>
            </div>
        </div>
    );
}
