import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const PROFILE_BUCKET = "profile";
const MAX_UPLOAD_SIZE_BYTES = 512 * 1024;
const ALLOWED_CONTENT_TYPES = new Set(["image/webp", "image/jpeg", "image/png"]);

const getSupabaseAdmin = () => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase service role environment belum diset.");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
};

const jsonError = (message: string, status = 400) => {
  return NextResponse.json({ success: false, error: message }, { status });
};

const sanitizeId = (value: FormDataEntryValue | null) => {
  return String(value ?? "").trim();
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const staffId = sanitizeId(formData.get("staff_id"));
    const file = formData.get("file");

    if (!staffId) {
      return jsonError("Staff ID tidak ditemukan.", 400);
    }

    if (!(file instanceof File)) {
      return jsonError("File foto wajib dikirim.", 400);
    }

    if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
      return jsonError("Format foto harus JPG, PNG, atau WEBP.", 400);
    }

    if (file.size <= 0) {
      return jsonError("File foto kosong.", 400);
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return jsonError("Foto masih terlalu besar setelah kompresi. Coba gunakan foto lain.", 400);
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: staff, error: staffError } = await supabaseAdmin
      .from("staff")
      .select("id, staff_code, profile_picture")
      .eq("id", staffId)
      .maybeSingle();

    if (staffError) throw staffError;

    if (!staff) {
      return jsonError("Data staff tidak ditemukan.", 404);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const timestamp = Date.now();
    const filePath = `${staffId}/profile-${timestamp}.webp`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(PROFILE_BUCKET)
      .upload(filePath, buffer, {
        cacheControl: "3600",
        contentType: "image/webp",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(PROFILE_BUCKET)
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabaseAdmin
      .from("staff")
      .update({
        profile_picture: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", staffId);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      profile_picture: publicUrl,
      path: filePath,
      size_bytes: file.size,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengunggah foto profil.";
    return jsonError(message, 500);
  }
}
