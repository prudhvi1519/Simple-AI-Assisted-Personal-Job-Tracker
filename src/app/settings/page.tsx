export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth/session";
import SettingsForm from "@/components/settings/SettingsForm";

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
            <h1 className="text-2xl font-bold text-gray-900 mb-8">Settings</h1>

            <div className="max-w-md">
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Change Password</h2>
                    <SettingsForm />
                </div>
            </div>
        </div>
    );
}
