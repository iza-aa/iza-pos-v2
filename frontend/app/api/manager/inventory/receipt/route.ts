import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const INVOICE_BUCKET = "invoice";
const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const getSupabaseAdmin = () => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase service role environment variables are not configured.");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

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

const sanitizeSegment = (value: FormDataEntryValue | null) => {
  return String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
};

const ensureInvoiceBucket = async (supabaseAdmin: ReturnType<typeof createClient>) => {
  const { data: existingBucket, error: getBucketError } = await supabaseAdmin.storage.getBucket(INVOICE_BUCKET);

  if (existingBucket) {
    if (!existingBucket.public) {
      const { error: updateBucketError } = await supabaseAdmin.storage.updateBucket(INVOICE_BUCKET, {
        public: true,
        fileSizeLimit: MAX_UPLOAD_SIZE_BYTES,
        allowedMimeTypes: Array.from(ALLOWED_CONTENT_TYPES),
      });

      if (updateBucketError) throw updateBucketError;
    }
    return;
  }

  const message = String(getBucketError?.message || "").toLowerCase();
  const statusCode = String((getBucketError as { statusCode?: string | number } | null)?.statusCode || "");

  if (getBucketError && !message.includes("not found") && statusCode !== "404") {
    throw getBucketError;
  }

  const { error: createBucketError } = await supabaseAdmin.storage.createBucket(INVOICE_BUCKET, {
    public: true,
    fileSizeLimit: MAX_UPLOAD_SIZE_BYTES,
    allowedMimeTypes: Array.from(ALLOWED_CONTENT_TYPES),
  });

  if (createBucketError) throw createBucketError;
};

export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id") ?? "";
  const userRole = request.headers.get("x-user-role") ?? "";

  if (!userId || !["owner", "manager"].includes(userRole)) {
    return jsonError("Owner or manager access required.", 403);
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const itemId = sanitizeSegment(formData.get("item_id")) || "inventory-item";

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

    const supabaseAdmin = getSupabaseAdmin();
    await ensureInvoiceBucket(supabaseAdmin);

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = `inventory/${itemId}/${Date.now()}-${sanitizeFileName(file.name)}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(INVOICE_BUCKET)
      .upload(filePath, buffer, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(INVOICE_BUCKET)
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      receiptUrl: publicUrlData.publicUrl,
      path: filePath,
      sizeBytes: file.size,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Receipt could not be uploaded.";
    return jsonError(message, 500);
  }
}
