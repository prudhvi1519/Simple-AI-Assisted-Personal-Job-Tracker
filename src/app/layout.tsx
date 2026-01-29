import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Simple Job Tracker",
    description: "Personal AI-assisted job application tracker",
    icons: {
        icon: "/brand/favicon.svg",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className="antialiased overflow-x-hidden">
                {children}
            </body>
        </html>
    );
}
