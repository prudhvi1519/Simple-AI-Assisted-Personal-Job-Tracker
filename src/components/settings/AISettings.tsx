"use client";

import { useState } from "react";

export default function AISettings() {
    const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");

    // GEMINI_MODEL is safe to display (not a secret)
    const geminiModel = process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-2.0-flash";

    const runHealthCheck = async () => {
        setStatus("loading");
        setErrorMsg("");
        try {
            const res = await fetch("/api/health/gemini");
            const data = await res.json();
            if (res.ok && data.ok) {
                setStatus("ok");
            } else {
                setStatus("error");
                setErrorMsg(data.error || "Unknown error");
            }
        } catch (err) {
            setStatus("error");
            setErrorMsg("Network error");
        }
    };

    return (
        <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">AI Settings</h2>
            <p className="text-sm text-gray-500 mb-4">
                Gemini AI integration for job extraction and suggestions.
            </p>
            <dl className="space-y-3 mb-4">
                <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-600">Model</dt>
                    <dd className="text-sm text-gray-900 font-mono">{geminiModel}</dd>
                </div>
                <div className="flex justify-between items-center">
                    <dt className="text-sm font-medium text-gray-600">API Status</dt>
                    <dd className="text-sm">
                        {status === "idle" && <span className="text-gray-400">—</span>}
                        {status === "loading" && <span className="text-blue-500">Checking...</span>}
                        {status === "ok" && <span className="text-green-600 font-medium">✓ Connected</span>}
                        {status === "error" && <span className="text-red-600 font-medium">✗ Error</span>}
                    </dd>
                </div>
            </dl>
            {status === "error" && errorMsg && (
                <p className="text-sm text-red-600 mb-3">{errorMsg}</p>
            )}
            <button
                onClick={runHealthCheck}
                disabled={status === "loading"}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
                {status === "loading" ? "Checking..." : "Run Gemini Health Check"}
            </button>
        </div>
    );
}
