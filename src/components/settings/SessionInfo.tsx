"use client";

export default function SessionInfo() {
    return (
        <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Session & Access</h2>
            <p className="text-sm text-gray-500 mb-4">
                Information about your current session and security settings.
            </p>
            <dl className="space-y-3">
                <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-600">Session Duration</dt>
                    <dd className="text-sm text-gray-900">24 hours</dd>
                </div>
                <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-600">Cookie Security</dt>
                    <dd className="text-sm text-gray-900">HttpOnly, SameSite=Lax</dd>
                </div>
                <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-600">HTTPS Only</dt>
                    <dd className="text-sm text-gray-900">Yes (in production)</dd>
                </div>
                <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-600">Last Login</dt>
                    <dd className="text-sm text-gray-400 italic">Not tracked</dd>
                </div>
            </dl>
        </div>
    );
}
