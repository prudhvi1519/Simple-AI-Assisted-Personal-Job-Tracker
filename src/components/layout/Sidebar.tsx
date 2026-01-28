"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
    {
        href: "/jobs",
        label: "Jobs",
        icon: (
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
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
            </svg>
        ),
    },
    {
        href: "/settings",
        label: "Settings",
        icon: (
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
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
            </svg>
        ),
    },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 border-r border-[var(--border)] bg-gray-50 dark:bg-gray-950 flex flex-col">
            {/* Logo */}
            <div className="p-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
                        <svg
                            className="w-5 h-5 text-white"
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
                    </div>
                    <span className="font-semibold text-lg">Job Tracker</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4">
                <ul className="space-y-1">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive
                                            ? "bg-[var(--primary)] text-white"
                                            : "hover:bg-gray-100 dark:hover:bg-gray-900 text-[var(--foreground)]"
                                        }`}
                                >
                                    {item.icon}
                                    <span>{item.label}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--border)] text-xs text-[var(--muted)]">
                Personal Job Tracker
            </div>
        </aside>
    );
}
