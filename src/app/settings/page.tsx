export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth/session";
import SettingsForm from "@/components/settings/SettingsForm";
import SessionInfo from "@/components/settings/SessionInfo";
import AISettings from "@/components/settings/AISettings";

export default async function SettingsPage() {
    // Server-side auth check
    const cookieStore = await cookies();
    const token = cookieStore.get("sjta_session")?.value;
    const session = await verifySessionToken(token);

    if (!session) {
        redirect("/login");
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Manage your account security, session preferences, and AI configuration.
                </p>
            </div>

            {/* Main Grid: 2 columns on desktop, 1 on mobile */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Account Security (wider) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-2">Account Security</h2>
                        <p className="text-sm text-gray-500 mb-6">
                            Update your password to keep your account secure. Password must be at least 8 characters.
                        </p>
                        <SettingsForm />
                    </div>
                </div>

                {/* Right Column: Session & AI Settings */}
                <div className="space-y-6">
                    <SessionInfo />
                    <AISettings />
                </div>
            </div>
        </div>
    );
}
