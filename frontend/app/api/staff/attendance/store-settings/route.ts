import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import {
  INTERNAL_SESSION_COOKIE,
  verifyInternalSessionToken,
} from "@/lib/auth/internalSession";

type StoreSettingsPayload = {
  id?: string | null;
  store_name?: string;
  store_latitude?: number;
  store_longitude?: number;
  attendance_radius_meters?: number;
};

type SavedStoreSettings = {
  id: string;
  store_name: string;
  store_latitude: number;
  store_longitude: number;
  attendance_radius_meters: number;
  is_active: boolean;
};

const createServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase service configuration is unavailable.");
  }

  return createClient(url, key, { auth: { persistSession: false } });
};

const getAuthorizedRequester = async (request: NextRequest) => {
  const session = await verifyInternalSessionToken(
    request.cookies.get(INTERNAL_SESSION_COOKIE)?.value,
  ).catch(() => null);

  if (!session || (session.role !== "owner" && session.role !== "manager")) {
    return null;
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("staff")
    .select("id, role, status")
    .eq("id", session.sub)
    .maybeSingle();

  if (
    error ||
    !data ||
    data.status !== "active" ||
    data.role !== session.role
  ) {
    return null;
  }

  return { session, supabase };
};

const isFiniteCoordinate = (
  value: unknown,
  minimum: number,
  maximum: number,
) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum;
};

export async function POST(request: NextRequest) {
  const requester = await getAuthorizedRequester(request);

  if (!requester) {
    return NextResponse.json(
      { error: "Owner or manager access is required." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as StoreSettingsPayload;
  const storeName = String(body.store_name ?? "").trim();
  const latitude = Number(body.store_latitude);
  const longitude = Number(body.store_longitude);
  const radius = Math.round(Number(body.attendance_radius_meters));

  if (
    !storeName ||
    !isFiniteCoordinate(latitude, -90, 90) ||
    !isFiniteCoordinate(longitude, -180, 180) ||
    !Number.isFinite(radius) ||
    radius <= 0
  ) {
    return NextResponse.json(
      { error: "Store name, coordinates, and attendance radius are invalid." },
      { status: 400 },
    );
  }

  try {
    const payload = {
      store_name: storeName,
      store_latitude: latitude,
      store_longitude: longitude,
      attendance_radius_meters: radius,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    let savedSettings: SavedStoreSettings;

    if (body.id) {
      const { data, error } = await requester.supabase
        .from("store_settings")
        .update(payload)
        .eq("id", body.id)
        .select(
          "id, store_name, store_latitude, store_longitude, attendance_radius_meters, is_active",
        )
        .single();

      if (error) throw error;
      savedSettings = data as SavedStoreSettings;
    } else {
      const { data, error } = await requester.supabase
        .from("store_settings")
        .insert([payload])
        .select(
          "id, store_name, store_latitude, store_longitude, attendance_radius_meters, is_active",
        )
        .single();

      if (error) throw error;
      savedSettings = data as SavedStoreSettings;
    }

    await requester.supabase
      .from("store_settings")
      .update({ is_active: false })
      .neq("id", savedSettings.id)
      .eq("is_active", true);

    return NextResponse.json({ success: true, data: savedSettings });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Store location could not be saved.",
      },
      { status: 500 },
    );
  }
}
