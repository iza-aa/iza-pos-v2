import type { SupabaseClient } from "@supabase/supabase-js";
import { getJakartaLocalDate } from "./date";
import type {
  AIInsight,
  OwnerInsightCategory,
  OwnerInsightRecord,
} from "./insightSchema";

const TABLE_NAME = "owner_ai_recommendations";
export const DAILY_GENERATION_LIMIT = 3;
const NO_EXPIRY_ISO = "9999-12-31T23:59:59.999Z";

async function getSameDayInsightRecord(
  supabase: SupabaseClient,
  ownerId: string,
  category: OwnerInsightCategory,
  periodKey: string,
) {
  const localDate = getJakartaLocalDate();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("owner_id", ownerId)
    .eq("category", category)
    .eq("local_date", localDate)
    .eq("period_key", periodKey)
    .maybeSingle();

  if (error) throw error;
  return data as OwnerInsightRecord | null;
}

export async function getTodayInsightRecord(
  supabase: SupabaseClient,
  ownerId: string,
  category: OwnerInsightCategory,
  periodKey = "today_vs_yesterday_v13",
) {
  const localDate = getJakartaLocalDate();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("owner_id", ownerId)
    .eq("category", category)
    .eq("period_key", periodKey)
    .lte("local_date", localDate)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as OwnerInsightRecord | null;
}

export async function getTodayInsightRecords(
  supabase: SupabaseClient,
  ownerId: string,
) {
  const localDate = getJakartaLocalDate();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("owner_id", ownerId)
    .lte("local_date", localDate)
    .order("generated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as OwnerInsightRecord[];
}

export async function saveTodayInsightRecord({
  supabase,
  ownerId,
  category,
  periodKey = "today_vs_yesterday_v13",
  insights,
  snapshot,
}: {
  supabase: SupabaseClient;
  ownerId: string;
  category: OwnerInsightCategory;
  periodKey?: string;
  insights: AIInsight[];
  snapshot: Record<string, unknown>;
}) {
  const localDate = getJakartaLocalDate();
  const existing = await getSameDayInsightRecord(
    supabase,
    ownerId,
    category,
    periodKey,
  );
  const nextCount = (existing?.generation_count ?? 0) + 1;

  if (nextCount > DAILY_GENERATION_LIMIT) {
    throw new Error("Daily recommendation limit reached for this category.");
  }

  const payload = {
    owner_id: ownerId,
    category,
    local_date: localDate,
    period_key: periodKey,
    insights_json: insights,
    snapshot_json: snapshot,
    generated_at: new Date().toISOString(),
    expires_at: NO_EXPIRY_ISO,
    generation_count: nextCount,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .upsert(payload, { onConflict: "owner_id,category,local_date,period_key" })
    .select("*")
    .single();

  if (error) throw error;
  return data as OwnerInsightRecord;
}
