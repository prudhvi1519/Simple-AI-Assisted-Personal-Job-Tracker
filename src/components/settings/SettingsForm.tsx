"use client";

import { useState } from "react";

export default function SettingsForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        const formData = new FormData(e.currentTarget);
        const currentPassword = formData.get("currentPassword") as string;
        const newPassword = formData.get("newPassword") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: "New passwords do not match" });
            setIsLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
            });

            const data = await res.json();

            if (!res.ok) {
                setMessage({ type: 'error', text: data.error || "Failed to change password" });
            } else {
                setMessage({ type: 'success', text: "Password changed successfully" });
                (e.target as HTMLFormElement).reset();
            }
        } catch (err) {
            setMessage({ type: 'error', text: "An unexpected error occurred" });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {message && (
                <div className={`p-4 rounded-md text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                    {message.text}
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700">Current Password</label>
                <input
                    name="currentPassword"
                    type="password"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">New Password</label>
                <input
                    name="newPassword"
                    type="password"
                    required
                    minLength={8}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                <input
                    name="confirmPassword"
                    type="password"
                    required
                    minLength={8}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                />
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
                {isLoading ? "Updating..." : "Update Password"}
            </button>
        </form>
    );
}
