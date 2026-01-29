import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
            {/* Subtle Background Pattern */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-1/2 -left-1/4 w-[800px] h-[800px] bg-gradient-to-r from-teal-500/20 to-purple-600/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-1/2 -right-1/4 w-[600px] h-[600px] bg-gradient-to-l from-teal-500/10 to-purple-600/10 rounded-full blur-3xl" />
            </div>

            {/* Content */}
            <div className="relative z-10">
                {/* Header */}
                <header className="px-6 py-6 flex items-center justify-between max-w-6xl mx-auto">
                    <div className="flex items-center gap-3">
                        <Image
                            src="/brand/favicon.svg"
                            alt="Logo"
                            width={40}
                            height={40}
                            className="w-10 h-10"
                        />
                        <span className="text-xl font-bold bg-gradient-to-r from-teal-400 to-purple-500 bg-clip-text text-transparent">
                            Simple Job Tracker
                        </span>
                    </div>
                    <Link
                        href="/login"
                        className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-purple-600 hover:from-teal-400 hover:to-purple-500 rounded-lg font-medium text-sm transition-all hover:shadow-lg hover:shadow-purple-500/25"
                    >
                        Login
                    </Link>
                </header>

                {/* Hero */}
                <section className="px-6 pt-20 pb-24 text-center max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-white/5 border border-white/10 rounded-full text-sm text-gray-300">
                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Admin-only • Your data stays yours
                    </div>

                    <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
                        Track Your
                        <span className="bg-gradient-to-r from-teal-400 to-purple-500 bg-clip-text text-transparent">
                            {" "}Job Search{" "}
                        </span>
                        Journey
                    </h1>

                    <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                        A personal, AI-assisted job application tracker.
                        Organize applications, extract job details with AI, and stay on top of your career search.
                    </p>

                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-teal-500 to-purple-600 hover:from-teal-400 hover:to-purple-500 rounded-xl font-semibold text-lg transition-all hover:shadow-xl hover:shadow-purple-500/30 hover:-translate-y-0.5"
                    >
                        Get Started
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </Link>
                </section>

                {/* Features */}
                <section className="px-6 py-16 max-w-5xl mx-auto">
                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Feature 1 */}
                        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-teal-500/50 transition-colors">
                            <div className="w-12 h-12 mb-4 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Organize Applications</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Track every application with status, priority, follow-up dates, and detailed notes.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-purple-500/50 transition-colors">
                            <div className="w-12 h-12 mb-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold mb-2">AI-Powered Extraction</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Paste a job description and let AI extract title, company, skills, and more automatically.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-teal-500/50 transition-colors">
                            <div className="w-12 h-12 mb-4 bg-gradient-to-br from-teal-500 to-purple-500 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Private & Secure</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Admin-only access with secure session cookies. Your job search data stays private.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Privacy Note */}
                <section className="px-6 py-12 text-center">
                    <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-xl">
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-300 text-sm">
                            Free-tier Gemini AI • No data sold • Self-hosted compatible
                        </span>
                    </div>
                </section>

                {/* Footer */}
                <footer className="px-6 py-8 text-center border-t border-white/10">
                    <p className="text-gray-500 text-sm">
                        © {new Date().getFullYear()} Simple Job Tracker. Personal use only.
                    </p>
                </footer>
            </div>
        </div>
    );
}
