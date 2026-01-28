import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export const metadata: Metadata = {
    title: "Job Tracker",
    description: "Personal AI-assisted job application tracker",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className="antialiased">
                <div className="flex h-screen">
                    <Sidebar />
                    <div className="flex flex-1 flex-col overflow-hidden">
                        <Topbar />
                        <main className="flex-1 overflow-auto p-6 bg-[var(--background)]">
                            {children}
                        </main>
                    </div>
                </div>
            </body>
        </html>
    );
}
