import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const MENU_BUCKET = "menu";
const MAX_UPLOAD_SIZE_BYTES = 700 * 1024;
const ALLOWED_CONTENT_TYPES = new Set(["image/webp", "image/jpeg", "image/png"]);

const getSupabaseAdmin = () => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase service role environment variables are not configured.");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
};

const jsonError = (message: string, status = 400) => {
  return NextResponse.json({ success: false, error: message }, { status });
};

const sanitizeFileSegment = (value: FormDataEntryValue | null) => {
  return String(value ?? "menu-item")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50) || "menu-item";
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const menuName = sanitizeFileSegment(formData.get("menu_name"));
    const menuId = sanitizeFileSegment(formData.get("menu_id"));

    if (!(file instanceof File)) {
      return jsonError("Menu image file is required.", 400);
    }

    if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
      return jsonError("Menu image must be JPG, PNG, or WEBP.", 400);
    }

    if (file.size <= 0) {
      return jsonError("Menu image file is empty.", 400);
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return jsonError("Menu image is still too large after compression. Please use another image.", 400);
    }

    const supabaseAdmin = getSupabaseAdmin();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const timestamp = Date.now();
    const folder = menuId !== "menu-item" ? menuId : menuName;
    const filePath = `${folder}/menu-${timestamp}.webp`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(MENU_BUCKET)
      .upload(filePath, buffer, {
        cacheControl: "3600",
        contentType: "image/webp",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabaseAdmin.storage.from(MENU_BUCKET).getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      image_url: publicUrlData.publicUrl,
      path: filePath,
      size_bytes: file.size,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload menu image.";
    return jsonError(message, 500);
  }
}
