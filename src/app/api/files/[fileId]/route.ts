import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireServerEnv, ENV_KEYS } from "@/lib/utils/env";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { JobFile } from "@/lib/supabase/client";

// Force dynamic - needs env vars at runtime
export const dynamic = "force-dynamic";

// Validate env at module load - REMOVED
// try {
//     requireServerEnv(ENV_KEYS.SUPABASE);
// } catch {
//     // Will be caught per-request
// }

interface RouteParams {
    params: Promise<{ fileId: string }>;
}

// GET /api/files/[fileId] - Download a file
export async function GET(request: NextRequest, { params }: RouteParams) {
    // Auth guard
    const authError = requireAdmin(request);
    if (authError) return authError;

    try {
        requireServerEnv(ENV_KEYS.SUPABASE);
        const { fileId } = await params;
        const supabase = getServerSupabase();

        // 1) Fetch file record from database
        const { data: file, error: fileError } = await supabase
            .from("job_files")
            .select("*")
            .eq("id", fileId)
            .single();

        if (fileError || !file) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        const jobFile = file as JobFile;

        // 2) Download from Supabase Storage
        const { data: fileData, error: downloadError } = await supabase.storage
            .from("job-files")
            .download(jobFile.storage_path);

        if (downloadError || !fileData) {
            console.error("Error downloading from storage:", downloadError);
            return NextResponse.json(
                { error: "Failed to download file from storage", details: downloadError?.message },
                { status: 500 }
            );
        }

        // 3) Return file with proper headers
        const arrayBuffer = await fileData.arrayBuffer();

        return new NextResponse(arrayBuffer, {
            status: 200,
            headers: {
                "Content-Type": jobFile.mime_type || "application/octet-stream",
                "Content-Disposition": `attachment; filename="${encodeURIComponent(jobFile.original_name)}"`,
                "Content-Length": String(jobFile.size_bytes || arrayBuffer.byteLength),
            },
        });
    } catch (err) {
        console.error("Unexpected error in file download:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// DELETE /api/files/[fileId] - Delete a file
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    // Auth guard
    const authError = requireAdmin(request);
    if (authError) return authError;

    try {
        requireServerEnv(ENV_KEYS.SUPABASE);
        const { fileId } = await params;
        const supabase = getServerSupabase();

        // 1) Fetch file record
        const { data: file, error: fileError } = await supabase
            .from("job_files")
            .select("*")
            .eq("id", fileId)
            .single();

        if (fileError || !file) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        const jobFile = file as JobFile;

        // 2) Delete from Supabase Storage
        const { error: storageError } = await supabase.storage
            .from("job-files")
            .remove([jobFile.storage_path]);

        if (storageError) {
            console.error("Error deleting from storage:", storageError);
            // Continue to delete DB record even if storage delete fails
            // (file might already be missing from storage)
        }

        // 3) Delete database record
        const { error: deleteError } = await supabase
            .from("job_files")
            .delete()
            .eq("id", fileId);

        if (deleteError) {
            console.error("Error deleting file record:", deleteError);
            return NextResponse.json(
                { error: "Failed to delete file record", details: deleteError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ ok: true, id: fileId });
    } catch (err) {
        console.error("Unexpected error in file delete:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
