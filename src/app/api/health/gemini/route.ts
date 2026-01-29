import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";

        if (!apiKey) {
            return NextResponse.json({
                ok: false,
                model,
                error: "GEMINI_API_KEY not configured"
            }, { status: 500 });
        }

        // Fetch model details to verify existence and capabilities
        // Do not include :generateContent here, just the model resource URL
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}?key=${apiKey}`,
            { method: "GET" }
        );

        if (!response.ok) {
            const errorText = await response.text();
            let errorJson;
            try { errorJson = JSON.parse(errorText); } catch { errorJson = { message: errorText }; }

            return NextResponse.json({
                ok: false,
                model,
                error: {
                    status: response.statusText,
                    code: response.status,
                    message: errorJson.error?.message || errorJson.message || "Model validation failed"
                }
            }, { status: 200 }); // Return 200 with ok:false for health checks implies "service reachable but unhealthy"
        }

        const data = await response.json();

        // Check for generateContent support
        const supportedMethods = data.supportedGenerationMethods || [];
        const supportsGenerateContent = supportedMethods.includes("generateContent");

        if (!supportsGenerateContent) {
            return NextResponse.json({
                ok: false,
                model,
                message: "Model exists but does not support generateContent",
                supportedMethods
            });
        }

        return NextResponse.json({
            ok: true,
            model,
            supportsGenerateContent: true
        });

    } catch (error) {
        return NextResponse.json({
            ok: false,
            error: error instanceof Error ? error.message : "Internal health check error"
        }, { status: 500 });
    }
}
