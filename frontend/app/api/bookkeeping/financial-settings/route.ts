import { NextResponse } from "next/server";
import { createBookkeepingSupabaseClient } from "@/lib/services/bookkeeping/bookkeepingServer";
import {
  defaultFinancialSettings,
} from "@/lib/services/bookkeeping/financialSettings";
import type { BookkeepingFinancialSettings } from "@/lib/services/bookkeeping/bookkeepingTypes";

type SettingsRow = {
  tax_enabled: boolean | null;
  tax_label: string | null;
  tax_rate: number | string | null;
  service_charge_enabled: boolean | null;
  service_charge_rate: number | string | null;
  prices_include_tax: boolean | null;
  updated_at?: string | null;
};

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const mapRowToSettings = (row: SettingsRow | null): BookkeepingFinancialSettings => {
  if (!row) return defaultFinancialSettings;

  return {
    taxEnabled: Boolean(row.tax_enabled),
    taxLabel: row.tax_label || defaultFinancialSettings.taxLabel,
    taxRate: toNumber(row.tax_rate),
    serviceChargeEnabled: Boolean(row.service_charge_enabled),
    serviceChargeRate: toNumber(row.service_charge_rate),
    pricesIncludeTax: Boolean(row.prices_include_tax),
    updatedAt: row.updated_at ?? null,
    updatedBy: null,
  };
};

export async function GET() {
  try {
    const supabase = createBookkeepingSupabaseClient();
    const { data, error } = await supabase
      .from("bookkeeping_financial_settings")
      .select("tax_enabled, tax_label, tax_rate, service_charge_enabled, service_charge_rate, prices_include_tax, updated_at")
      .eq("id", "global")
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ settings: mapRowToSettings(data as SettingsRow | null) });
  } catch (error) {
    console.warn("Falling back to default financial settings:", error);
    return NextResponse.json({ settings: defaultFinancialSettings });
  }
}
