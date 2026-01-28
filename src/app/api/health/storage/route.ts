import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireServerEnv, ENV_KEYS } from "@/lib/utils/env";

// Force dynamic - needs env vars at runtime
export const dynamic = "force-dynamic";

const BUCKET_NAME = "job-files";

/**
 * GET /api/health/storage - Test Supabase Storage bucket round-trip
 * Uploads, downloads, and deletes a test file
 */
export async function GET() {
    try {
        // 1) Validate env vars
        try {
            requireServerEnv(ENV_KEYS.SUPABASE);
        } catch (err) {
            return NextResponse.json(
                {
                    ok: false,
                    bucket: BUCKET_NAME,
                    error: err instanceof Error ? err.message : "Missing env vars",
                },
                { status: 503 }
            );
        }

        const supabase = getServerSupabase();

        // 2) Generate unique test path
        const testId = crypto.randomUUID();
        const testPath = `healthcheck/${testId}.txt`;
        const testContent = "ok";

        // 3) Upload test file
        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(testPath, testContent, {
                contentType: "text/plain",
                upsert: false,
            });

        if (uploadError) {
            console.error("Storage health: upload error", uploadError);
            return NextResponse.json(
                {
                    ok: false,
                    bucket: BUCKET_NAME,
                    error: uploadError.message || "Upload failed",
                },
                { status: 503 }
            );
        }

        // 4) Download and verify content
        const { data: downloadData, error: downloadError } = await supabase.storage
            .from(BUCKET_NAME)
            .download(testPath);

        if (downloadError || !downloadData) {
            // Cleanup attempt
            await supabase.storage.from(BUCKET_NAME).remove([testPath]);
            console.error("Storage health: download error", downloadError);
            return NextResponse.json(
                {
                    ok: false,
                    bucket: BUCKET_NAME,
                    error: downloadError?.message || "Download failed",
                },
                { status: 503 }
            );
        }

        const downloadedText = await downloadData.text();
        if (downloadedText !== testContent) {
            // Cleanup attempt
            await supabase.storage.from(BUCKET_NAME).remove([testPath]);
            return NextResponse.json(
                {
                    ok: false,
                    bucket: BUCKET_NAME,
                    error: "Content mismatch after download",
                },
                { status: 503 }
            );
        }

        // 5) Delete test file
        const { error: deleteError } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([testPath]);

        if (deleteError) {
            console.error("Storage health: delete error", deleteError);
            return NextResponse.json(
                {
                    ok: false,
                    bucket: BUCKET_NAME,
                    error: deleteError.message || "Delete failed",
                },
                { status: 503 }
            );
        }

        // 6) Success
        return NextResponse.json({
            ok: true,
            bucket: BUCKET_NAME,
        });
    } catch (err) {
        console.error("Storage health: unexpected error", err);
        return NextResponse.json(
            {
                ok: false,
                bucket: BUCKET_NAME,
                error: err instanceof Error ? err.message : "Unexpected error",
            },
            { status: 500 }
        );
    }
}
