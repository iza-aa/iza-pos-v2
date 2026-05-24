import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { OwnerInsightCategory } from "./insightSchema";
import { buildCustomerRecommendationSnapshot } from "./customerSnapshotBuilder";
import { buildInventoryRecommendationSnapshot } from "./inventorySnapshotBuilder";
import { buildOperationsRecommendationSnapshot } from "./operationsSnapshotBuilder";
import { buildOverviewRecommendationSnapshot } from "./overviewSnapshotBuilder";
import { buildSalesRecommendationSnapshot } from "./salesSnapshotBuilder";
import { buildStaffRecommendationSnapshot } from "./staffSnapshotBuilder";
import type { OwnerInsightPeriod } from "./recommendationSnapshotTypes";

export type { OwnerInsightPeriod } from "./recommendationSnapshotTypes";

const OWNER_INSIGHT_PROMPT_VERSION = "v13";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isDateString = (value: string | undefined) =>
  Boolean(value && DATE_PATTERN.test(value));

export const buildOwnerInsightPeriodKey = (period?: OwnerInsightPeriod) => {
  if (!period || !isDateString(period.startDate) || !isDateString(period.endDate)) {
    return `today_vs_yesterday_${OWNER_INSIGHT_PROMPT_VERSION}`;
  }

  return `${period.startDate}_${period.endDate}_${OWNER_INSIGHT_PROMPT_VERSION}`;
};

export function createOwnerInsightSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Owner AI recommendations require NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server.",
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function buildOwnerInsightSnapshot(
  category: OwnerInsightCategory,
  insightPeriod?: OwnerInsightPeriod,
  supabase = createOwnerInsightSupabaseClient(),
): Promise<Record<string, unknown>> {
  switch (category) {
    case "overview":
      return buildOverviewRecommendationSnapshot(supabase, insightPeriod);
    case "sales":
      return buildSalesRecommendationSnapshot(supabase, insightPeriod);
    case "rewards":
      return buildCustomerRecommendationSnapshot(supabase, insightPeriod);
    case "inventory":
      return buildInventoryRecommendationSnapshot(supabase, insightPeriod);
    case "staff":
      return buildStaffRecommendationSnapshot(supabase, insightPeriod);
    case "operations":
      return buildOperationsRecommendationSnapshot(supabase, insightPeriod);
    default: {
      const exhaustiveCategory: never = category;
      throw new Error(`Unsupported owner insight category: ${exhaustiveCategory}`);
    }
  }
}
