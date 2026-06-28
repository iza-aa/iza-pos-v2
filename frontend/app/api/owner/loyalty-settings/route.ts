import { NextRequest, NextResponse } from "next/server";
import { createBookkeepingSupabaseClient } from "@/lib/services/bookkeeping/bookkeepingServer";

export type LoyaltySettings = {
  pointsPerAmount: number;
  amountPerPoints: number;
  minimumOrderAmount: number;
  isActive: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
};

type LoyaltySettingsRow = {
  id: string;
  points_per_amount: number | string | null;
  amount_per_points: number | string | null;
  minimum_order_amount: number | string | null;
  is_active: boolean | null;
  updated_by?: string | null;
  updated_at?: string | null;
};

const SETTINGS_ID = "global";

export const defaultLoyaltySettings: LoyaltySettings = {
  pointsPerAmount: 1,
  amountPerPoints: 10000,
  minimumOrderAmount: 0,
  isActive: true,
  updatedAt: null,
  updatedBy: null,
};

const getRequester = (request: NextRequest) => ({
  id: request.headers.get("x-user-id") ?? "",
  name: request.headers.get("x-user-name") ?? "Owner",
  role: request.headers.get("x-user-role") ?? "",
});

const toInt = (value: unknown, fallback = 0): number => {
  const parsed = parseInt(String(value ?? fallback), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const mapRowToSettings = (row: LoyaltySettingsRow | null): LoyaltySettings => {
  if (!row) return defaultLoyaltySettings;
  return {
    pointsPerAmount: toInt(row.points_per_amount, 1),
    amountPerPoints: toInt(row.amount_per_points, 10000),
    minimumOrderAmount: toInt(row.minimum_order_amount, 0),
    isActive: row.is_active !== false,
    updatedAt: row.updated_at ?? null,
    updatedBy: row.updated_by ?? null,
  };
};

const normalizeRequest = (body: Partial<LoyaltySettings>): LoyaltySettings => {
  const pointsPerAmount = toInt(body.pointsPerAmount, 1);
  const amountPerPoints = toInt(body.amountPerPoints, 10000);
  const minimumOrderAmount = toInt(body.minimumOrderAmount, 0);

  if (pointsPerAmount < 1 || pointsPerAmount > 1000) {
    throw new Error("Jumlah poin harus antara 1 dan 1000.");
  }
  if (amountPerPoints < 1000 || amountPerPoints > 10_000_000) {
    throw new Error("Nominal belanja per poin harus antara Rp 1.000 dan Rp 10.000.000.");
  }
  if (minimumOrderAmount < 0 || minimumOrderAmount > 10_000_000) {
    throw new Error("Minimum order tidak boleh negatif atau melebihi Rp 10.000.000.");
  }

  return {
    pointsPerAmount,
    amountPerPoints,
    minimumOrderAmount,
    isActive: Boolean(body.isActive ?? true),
    updatedAt: null,
    updatedBy: null,
  };
};

export async function GET(request: NextRequest) {
  const requester = getRequester(request);

  if (!requester.id || requester.role !== "owner") {
    return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  }

  try {
    const supabase = createBookkeepingSupabaseClient();
    const { data, error } = await supabase
      .from("loyalty_settings")
      .select("id, points_per_amount, amount_per_points, minimum_order_amount, is_active, updated_by, updated_at")
      .eq("id", SETTINGS_ID)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ settings: mapRowToSettings(data as LoyaltySettingsRow | null) });
  } catch (error) {
    console.error("Failed to load loyalty settings:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Loyalty settings could not be loaded." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const requester = getRequester(request);

  if (!requester.id || requester.role !== "owner") {
    return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Partial<LoyaltySettings>;
    const settings = normalizeRequest(body);
    const supabase = createBookkeepingSupabaseClient();
    const now = new Date().toISOString();

    const { error } = await supabase.from("loyalty_settings").upsert({
      id: SETTINGS_ID,
      points_per_amount: settings.pointsPerAmount,
      amount_per_points: settings.amountPerPoints,
      minimum_order_amount: settings.minimumOrderAmount,
      is_active: settings.isActive,
      updated_by: requester.id,
      updated_at: now,
    });

    if (error) throw error;

    await supabase.from("activity_logs").insert({
      user_id: requester.id,
      user_name: requester.name,
      user_role: "owner",
      action: "UPDATE",
      action_category: "SETTINGS",
      action_description: "Updated loyalty point settings",
      resource_type: "Loyalty Settings",
      resource_id: SETTINGS_ID,
      resource_name: "Loyalty point configuration",
      previous_value: null,
      new_value: settings,
      changes_summary: [
        `${settings.pointsPerAmount} poin per Rp ${settings.amountPerPoints.toLocaleString("id-ID")}`,
        `Minimum order: Rp ${settings.minimumOrderAmount.toLocaleString("id-ID")}`,
        `Status: ${settings.isActive ? "aktif" : "nonaktif"}`,
      ],
      severity: "info",
      tags: ["loyalty", "settings", "points"],
      notes: null,
      is_reversible: true,
      ip_address: "0.0.0.0",
      device_info: "Server API",
      session_id: `loyalty-${requester.id}`,
    });

    return NextResponse.json({
      success: true,
      settings: { ...settings, updatedAt: now, updatedBy: requester.id },
    });
  } catch (error) {
    console.error("Failed to save loyalty settings:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Loyalty settings could not be saved." },
      { status: 500 },
    );
  }
}
