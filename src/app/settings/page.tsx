import Button from "@/components/ui/Button";

export default function SettingsPage() {
    return (
        <div className="max-w-2xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Settings</h1>
                <p className="text-[var(--muted)] text-sm">
                    Manage your data and preferences
                </p>
            </div>

            {/* Export section */}
            <div className="rounded-lg border border-[var(--border)] p-4 space-y-4">
                <h2 className="font-medium">Export Data</h2>
                <p className="text-sm text-[var(--muted)]">
                    Download all your job application data as a CSV file.
                </p>
                <Button variant="secondary">Export as CSV</Button>
            </div>

            {/* Danger zone */}
            <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 p-4 space-y-4">
                <h2 className="font-medium text-red-800 dark:text-red-200">
                    Danger Zone
                </h2>
                <p className="text-sm text-red-600 dark:text-red-400">
                    Permanently delete all your data. This action cannot be undone.
                </p>
                <Button variant="danger">Delete All Data</Button>
            </div>
        </div>
    );
}
