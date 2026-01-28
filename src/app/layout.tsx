import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { SidebarProvider } from "@/components/layout/SidebarProvider";

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
            <body className="antialiased overflow-x-hidden">
                <SidebarProvider>
                    <div className="flex h-screen">
                        <Sidebar />
                        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
                            <Topbar />
                            <main className="flex-1 overflow-auto p-4 md:p-6 bg-[var(--background)]">
                                <div className="max-w-full">
                                    {children}
                                </div>
                            </main>
                        </div>
                    </div>
                </SidebarProvider>
            </body>
        </html>
    );
}
