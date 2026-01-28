import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireServerEnv, ENV_KEYS } from "@/lib/utils/env";
import { Job, JobFile, FILE_TYPES } from "@/lib/supabase/client";

// Force dynamic - needs env vars at runtime
export const dynamic = "force-dynamic";

// Validate env at module load
// try {
//     requireServerEnv(ENV_KEYS.SUPABASE);
// } catch {
//     // Will be caught per-request
// }

interface RouteParams {
    params: Promise<{ id: string }>;
}

// POST /api/jobs/[id]/files - Upload a file (resume or document)
export async function POST(request: NextRequest, { params }: RouteParams) {
    const { id: jobId } = await params;

    // Check env vars first (fail fast)
    try {
        requireServerEnv(ENV_KEYS.SUPABASE);
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Missing env vars" },
            { status: 500 }
        );
    }

    const supabase = getServerSupabase();

    // Variables for cleanup on error
    let insertedFileId: string | null = null;

    try {
        // 1) Validate job exists
        const { data: job, error: jobError } = await supabase
            .from("jobs")
            .select("id, status")
            .eq("id", jobId)
            .single();

        if (jobError || !job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        // 2) Parse multipart form data
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const fileType = formData.get("fileType") as string | null;

        if (!file) {
            return NextResponse.json(
                { error: "Missing file in form data" },
                { status: 400 }
            );
        }

        if (!fileType || !FILE_TYPES.includes(fileType as "resume" | "document")) {
            return NextResponse.json(
                { error: "Invalid fileType. Must be 'resume' or 'document'" },
                { status: 400 }
            );
        }

        const originalName = file.name;
        const mimeType = file.type || "application/octet-stream";
        const sizeBytes = file.size;

        // 3) Create job_files row first with placeholder storage_path
        const { data: insertedFile, error: insertError } = await supabase
            .from("job_files")
            .insert({
                job_id: jobId,
                file_type: fileType,
                original_name: originalName,
                storage_path: "pending", // Placeholder, will update after upload
                mime_type: mimeType,
                size_bytes: sizeBytes,
            })
            .select()
            .single();

        if (insertError || !insertedFile) {
            console.error("Error inserting job_files row:", insertError);
            return NextResponse.json(
                { error: "Failed to create file record", details: insertError?.message },
                { status: 500 }
            );
        }

        insertedFileId = insertedFile.id;

        // 4) Build storage path using fileId
        // Convention: jobs/<jobId>/<fileType>/<fileId>-<originalName>
        const storagePath = `jobs/${jobId}/${fileType}/${insertedFile.id}-${originalName}`;

        // 5) Read file as ArrayBuffer and upload to Supabase Storage
        const fileBuffer = await file.arrayBuffer();
        const { error: uploadError } = await supabase.storage
            .from("job-files")
            .upload(storagePath, fileBuffer, {
                contentType: mimeType,
                upsert: false,
            });

        if (uploadError) {
            console.error("Error uploading to storage:", uploadError);
            // Cleanup: delete the inserted DB row
            await supabase.from("job_files").delete().eq("id", insertedFileId);
            return NextResponse.json(
                { error: "Failed to upload file to storage", details: uploadError.message },
                { status: 500 }
            );
        }

        // 6) Update job_files row with actual storage_path
        const { data: updatedFile, error: updateError } = await supabase
            .from("job_files")
            .update({ storage_path: storagePath })
            .eq("id", insertedFileId)
            .select()
            .single();

        if (updateError) {
            console.error("Error updating storage_path:", updateError);
            // Cleanup storage and DB row
            await supabase.storage.from("job-files").remove([storagePath]);
            await supabase.from("job_files").delete().eq("id", insertedFileId);
            return NextResponse.json(
                { error: "Failed to update file record", details: updateError.message },
                { status: 500 }
            );
        }

        // 7) AUTO STATUS RULE for resumes
        let jobStatusUpdated = false;
        if (fileType === "resume") {
            const currentStatus = (job as Job).status;
            // Only update if status is "Saved" or null/empty
            if (!currentStatus || currentStatus === "Saved") {
                const { error: statusError } = await supabase
                    .from("jobs")
                    .update({ status: "Applied" })
                    .eq("id", jobId);

                if (!statusError) {
                    jobStatusUpdated = true;
                }
            }
        }

        // 8) Return success response
        return NextResponse.json(
            {
                file: updatedFile as JobFile,
                jobStatusUpdated,
            },
            { status: 201 }
        );
    } catch (err) {
        console.error("Unexpected error in file upload:", err);

        // Cleanup if we inserted a file record
        if (insertedFileId) {
            await supabase.from("job_files").delete().eq("id", insertedFileId);
        }

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// GET /api/jobs/[id]/files - List files for a job (convenience endpoint)
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: jobId } = await params;
        const supabase = getServerSupabase();

        const { data: files, error } = await supabase
            .from("job_files")
            .select("*")
            .eq("job_id", jobId)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching files:", error);
            return NextResponse.json(
                { error: "Failed to fetch files", details: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ files: files as JobFile[] });
    } catch (err) {
        console.error("Unexpected error in GET files:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
