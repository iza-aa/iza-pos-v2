import { NextRequest, NextResponse } from "next/server";
import { createBookkeepingSupabaseClient } from "@/lib/services/bookkeeping/bookkeepingServer";
import { type SupabaseClient } from "@supabase/supabase-js";

const RECEIPT_BUCKET = "receiptexpense";
const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const getRequester = (request: NextRequest) => ({
  id: request.headers.get("x-user-id") ?? "",
  name: request.headers.get("x-user-name") ?? "Owner",
  role: request.headers.get("x-user-role") ?? "",
});

const jsonError = (message: string, status = 400) => {
  return NextResponse.json({ success: false, error: message }, { status });
};

const sanitizeFileName = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "receipt";
};

const ensureReceiptBucket = async (supabaseAdmin: SupabaseClient) => {
  const { data: existingBucket, error: getBucketError } = await supabaseAdmin.storage.getBucket(RECEIPT_BUCKET);

  if (existingBucket) {
    if (!existingBucket.public) {
      const { error: updateBucketError } = await supabaseAdmin.storage.updateBucket(RECEIPT_BUCKET, {
        public: true,
        fileSizeLimit: MAX_UPLOAD_SIZE_BYTES,
      });
      if (updateBucketError) throw updateBucketError;
    }
    return;
  }

  const message = String(getBucketError?.message || "").toLowerCase();
  const statusCode = String((getBucketError as { statusCode?: string | number } | null)?.statusCode || "");

  if (getBucketError && !message.includes("not found") && statusCode !== "404" && statusCode !== "400") {
    throw getBucketError;
  }

  const { error: createBucketError } = await supabaseAdmin.storage.createBucket(RECEIPT_BUCKET, {
    public: true,
    fileSizeLimit: MAX_UPLOAD_SIZE_BYTES,
  });

  if (createBucketError) throw createBucketError;
};

export async function POST(request: NextRequest) {
  const requester = getRequester(request);

  if (!requester.id || (requester.role !== "owner" && requester.role !== "manager")) {
    return jsonError("Owner or Manager access required.", 403);
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonError("Receipt file is required.", 400);
    }

    if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
      return jsonError("Receipt must be a PDF, JPG, PNG, or WEBP file.", 400);
    }

    if (file.size <= 0) {
      return jsonError("Receipt file is empty.", 400);
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return jsonError("Receipt file is too large. Maximum size is 5 MB.", 400);
    }

    const supabase = createBookkeepingSupabaseClient();
    await ensureReceiptBucket(supabase);
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = `${requester.id}/${Date.now()}-${sanitizeFileName(file.name)}`;

    const { error: uploadError } = await supabase.storage
      .from(RECEIPT_BUCKET)
      .upload(filePath, buffer, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from(RECEIPT_BUCKET)
      .getPublicUrl(filePath);

    await supabase.from("activity_logs").insert({
      user_id: requester.id,
      user_name: requester.name,
      user_role: requester.role,
      action: "CREATE",
      action_category: "FINANCIAL",
      action_description: "Uploaded bookkeeping expense receipt",
      resource_type: "Bookkeeping Expense Receipt",
      resource_id: filePath,
      resource_name: file.name,
      previous_value: null,
      new_value: { filePath, size: file.size, contentType: file.type },
      changes_summary: ["Uploaded expense receipt file"],
      severity: "info",
      tags: ["bookkeeping", "expense", "receipt"],
      notes: null,
      is_reversible: false,
      ip_address: "0.0.0.0",
      device_info: "Server API",
      session_id: `bookkeeping-${requester.id}`,
    });

    return NextResponse.json({
      success: true,
      receiptUrl: publicUrlData.publicUrl,
      path: filePath,
      sizeBytes: file.size,
    });
  } catch (error) {
    console.error("Failed to upload bookkeeping receipt:", error);
    return jsonError(
      error instanceof Error ? error.message : "Receipt could not be uploaded.",
      500,
    );
  }
}
