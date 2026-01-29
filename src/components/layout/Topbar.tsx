"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSidebar } from "./SidebarProvider";

function getPageTitle(pathname: string): string {
    if (pathname.startsWith("/jobs")) {
        if (pathname === "/jobs") return "Jobs";
        return "Job Details";
    }
    if (pathname.startsWith("/settings")) return "Settings";
    return "Job Tracker";
}

export default function Topbar() {
    const pathname = usePathname();
    const router = useRouter();
    const title = getPageTitle(pathname);
    const { toggle } = useSidebar();
    const [loggingOut, setLoggingOut] = useState(false);

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/login");
            router.refresh();
        } catch (err) {
            console.error("Logout error:", err);
            setLoggingOut(false);
        }
    };

    return (
        <header className="h-16 border-b border-[var(--border)] bg-[var(--background)] flex items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-3">
                {/* Hamburger menu (mobile only) */}
                <button
                    className="md:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    onClick={toggle}
                    aria-label="Open menu"
                >
                    <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 6h16M4 12h16M4 18h16"
                        />
                    </svg>
                </button>
                <h1 className="text-lg font-semibold">{title}</h1>
            </div>
            <div className="flex items-center gap-4">
                {/* Search - hidden on small mobile, visible on larger screens */}
                <div className="relative hidden sm:block">
                    <input
                        type="text"
                        placeholder="Search jobs..."
                        className="w-48 md:w-64 h-9 pl-9 pr-4 text-sm rounded-lg border border-[var(--border)] bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                    />
                    <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                </div>

                {/* Logout button */}
                <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                    aria-label="Logout"
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
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                    </svg>
                    <span className="hidden sm:inline">{loggingOut ? "..." : "Logout"}</span>
                </button>
            </div>
        </header>
    );
}
