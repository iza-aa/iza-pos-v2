import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getJakartaEndOfDayIso,
  getJakartaLocalDate,
} from "./date";
import type {
  AIInsight,
  OwnerInsightCategory,
  OwnerInsightRecord,
} from "./insightSchema";

const TABLE_NAME = "owner_ai_recommendations";
export const DAILY_GENERATION_LIMIT = 3;

export async function getTodayInsightRecord(
  supabase: SupabaseClient,
  ownerId: string,
  category: OwnerInsightCategory,
) {
  const localDate = getJakartaLocalDate();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("owner_id", ownerId)
    .eq("category", category)
    .eq("local_date", localDate)
    .gt("expires_at", new Date().toISOString())
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
    .eq("local_date", localDate)
    .gt("expires_at", new Date().toISOString())
    .order("generated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as OwnerInsightRecord[];
}

export async function saveTodayInsightRecord({
  supabase,
  ownerId,
  category,
  insights,
  snapshot,
}: {
  supabase: SupabaseClient;
  ownerId: string;
  category: OwnerInsightCategory;
  insights: AIInsight[];
  snapshot: Record<string, unknown>;
}) {
  const localDate = getJakartaLocalDate();
  const existing = await getTodayInsightRecord(supabase, ownerId, category);
  const nextCount = (existing?.generation_count ?? 0) + 1;

  if (nextCount > DAILY_GENERATION_LIMIT) {
    throw new Error("Daily recommendation limit reached for this category.");
  }

  const payload = {
    owner_id: ownerId,
    category,
    local_date: localDate,
    period_key: "today_vs_yesterday",
    insights_json: insights,
    snapshot_json: snapshot,
    generated_at: new Date().toISOString(),
    expires_at: getJakartaEndOfDayIso(localDate),
    generation_count: nextCount,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .upsert(payload, { onConflict: "owner_id,category,local_date" })
    .select("*")
    .single();

  if (error) throw error;
  return data as OwnerInsightRecord;
}
