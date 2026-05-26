import { NextRequest, NextResponse } from "next/server";
import { createBookkeepingSupabaseClient } from "@/lib/services/bookkeeping/bookkeepingServer";
import type { BookkeepingFinancialSettings } from "@/lib/services/bookkeeping/bookkeepingTypes";

type SettingsRow = {
  id: string;
  tax_enabled: boolean | null;
  tax_label: string | null;
  tax_rate: number | string | null;
  service_charge_enabled: boolean | null;
  service_charge_rate: number | string | null;
  prices_include_tax: boolean | null;
  updated_by?: string | null;
  updated_at?: string | null;
};

type SettingsRequest = Partial<BookkeepingFinancialSettings>;

const SETTINGS_ID = "global";

const defaultSettings: BookkeepingFinancialSettings = {
  taxEnabled: false,
  taxLabel: "PPN",
  taxRate: 0,
  serviceChargeEnabled: false,
  serviceChargeRate: 0,
  pricesIncludeTax: false,
  updatedAt: null,
  updatedBy: null,
};

const getRequester = (request: NextRequest) => ({
  id: request.headers.get("x-user-id") ?? "",
  name: request.headers.get("x-user-name") ?? "Owner",
  role: request.headers.get("x-user-role") ?? "",
});

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const mapRowToSettings = (row: SettingsRow | null): BookkeepingFinancialSettings => {
  if (!row) return defaultSettings;

  return {
    taxEnabled: Boolean(row.tax_enabled),
    taxLabel: row.tax_label || defaultSettings.taxLabel,
    taxRate: toNumber(row.tax_rate),
    serviceChargeEnabled: Boolean(row.service_charge_enabled),
    serviceChargeRate: toNumber(row.service_charge_rate),
    pricesIncludeTax: Boolean(row.prices_include_tax),
    updatedAt: row.updated_at ?? null,
    updatedBy: row.updated_by ?? null,
  };
};

const normalizeSettings = (body: SettingsRequest): BookkeepingFinancialSettings => {
  const taxRate = toNumber(body.taxRate);
  const serviceChargeRate = toNumber(body.serviceChargeRate);
  const taxLabel = String(body.taxLabel || "PPN").trim().slice(0, 24);

  if (taxRate < 0 || taxRate > 100) {
    throw new Error("Tax rate must be between 0 and 100.");
  }

  if (serviceChargeRate < 0 || serviceChargeRate > 100) {
    throw new Error("Service charge rate must be between 0 and 100.");
  }

  if (!taxLabel) {
    throw new Error("Tax label is required.");
  }

  return {
    taxEnabled: Boolean(body.taxEnabled),
    taxLabel,
    taxRate,
    serviceChargeEnabled: Boolean(body.serviceChargeEnabled),
    serviceChargeRate,
    pricesIncludeTax: Boolean(body.pricesIncludeTax),
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
      .from("bookkeeping_financial_settings")
      .select("*")
      .eq("id", SETTINGS_ID)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ settings: mapRowToSettings(data as SettingsRow | null) });
  } catch (error) {
    console.error("Failed to load bookkeeping settings:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "Bookkeeping settings could not be loaded.",
      },
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
    const settings = normalizeSettings((await request.json().catch(() => ({}))) as SettingsRequest);
    const supabase = createBookkeepingSupabaseClient();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("bookkeeping_financial_settings")
      .upsert({
        id: SETTINGS_ID,
        tax_enabled: settings.taxEnabled,
        tax_label: settings.taxLabel,
        tax_rate: settings.taxRate,
        service_charge_enabled: settings.serviceChargeEnabled,
        service_charge_rate: settings.serviceChargeRate,
        prices_include_tax: settings.pricesIncludeTax,
        updated_by: requester.id,
        updated_at: now,
      });

    if (error) throw error;

    await supabase.from("activity_logs").insert({
      user_id: requester.id,
      user_name: requester.name,
      user_role: "owner",
      action: "UPDATE",
      action_category: "FINANCIAL",
      action_description: "Updated bookkeeping financial settings",
      resource_type: "Bookkeeping Financial Settings",
      resource_id: SETTINGS_ID,
      resource_name: "Tax and service charge settings",
      previous_value: null,
      new_value: settings,
      changes_summary: [
        `Tax ${settings.taxEnabled ? "enabled" : "disabled"} at ${settings.taxRate}%`,
        `Service charge ${settings.serviceChargeEnabled ? "enabled" : "disabled"} at ${settings.serviceChargeRate}%`,
      ],
      severity: "info",
      tags: ["bookkeeping", "settings", "tax"],
      notes: null,
      is_reversible: true,
      ip_address: "0.0.0.0",
      device_info: "Server API",
      session_id: `bookkeeping-${requester.id}`,
    });

    return NextResponse.json({
      success: true,
      settings: {
        ...settings,
        updatedAt: now,
        updatedBy: requester.id,
      },
    });
  } catch (error) {
    console.error("Failed to save bookkeeping settings:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "Bookkeeping settings could not be saved.",
      },
      { status: 500 },
    );
  }
}
