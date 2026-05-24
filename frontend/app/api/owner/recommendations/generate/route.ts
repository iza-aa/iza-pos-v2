import { NextRequest, NextResponse } from "next/server";
import {
  buildOwnerInsightPeriodKey,
  buildOwnerInsightSnapshot,
  createOwnerInsightSupabaseClient,
  type OwnerInsightPeriod,
} from "@/lib/services/owner-insights/snapshotService";
import { generateGeminiInsights } from "@/lib/services/owner-insights/geminiInsightService";
import {
  buildDataSummaryInsight,
  isOwnerInsightCategory,
  sanitizeInsights,
  type AIInsight,
  type OwnerInsightCategory,
} from "@/lib/services/owner-insights/insightSchema";
import { buildDeterministicIssueFallback } from "@/lib/services/owner-insights/allowedIssueInsightGuards";
import { saveTodayInsightRecord } from "@/lib/services/owner-insights/storageService";
import { describeUnknownError } from "@/lib/services/owner-insights/errorUtils";

type GenerateRequest = {
  category?: string;
  period?: Partial<OwnerInsightPeriod>;
};

const normalizePeriod = (
  period: GenerateRequest["period"],
): OwnerInsightPeriod | undefined => {
  if (!period?.startDate || !period?.endDate) return undefined;
  const validDate = /^\d{4}-\d{2}-\d{2}$/;

  if (!validDate.test(period.startDate) || !validDate.test(period.endDate)) {
    return undefined;
  }

  if (period.startDate > period.endDate) return undefined;

  return {
    startDate: period.startDate,
    endDate: period.endDate,
  };
};

const getRequester = (request: NextRequest) => ({
  id: request.headers.get("x-user-id") ?? "",
  name: request.headers.get("x-user-name") ?? "Owner",
  role: request.headers.get("x-user-role") ?? "",
});

async function logRecommendationActivity({
  ownerId,
  ownerName,
  category,
  insightCount,
}: {
  ownerId: string;
  ownerName: string;
  category: string;
  insightCount: number;
}) {
  try {
    const supabase = createOwnerInsightSupabaseClient();
    await supabase.from("activity_logs").insert({
      user_id: ownerId,
      user_name: ownerName,
      user_role: "owner",
      action: "UPDATE",
      action_category: "REPORT",
      action_description: `Generated ${insightCount} AI recommendation insight(s) for ${category}`,
      resource_type: "Owner AI Recommendation",
      resource_id: category,
      resource_name: category,
      previous_value: null,
      new_value: { category, insightCount },
      changes_summary: [`Generated AI recommendations for ${category}`],
      severity: "info",
      tags: ["ai", "recommendation", category],
      notes: null,
      is_reversible: false,
      ip_address: "0.0.0.0",
      device_info: "Server API",
      session_id: `owner-ai-${ownerId}`,
    });
  } catch (error) {
    console.warn("Failed to log AI recommendation activity:", error);
  }
}

async function saveRecommendationRecord({
  ownerId,
  category,
  periodKey,
  insights,
  snapshot,
}: {
  ownerId: string;
  category: OwnerInsightCategory;
  periodKey: string;
  insights: AIInsight[];
  snapshot: Record<string, unknown>;
}) {
  const supabase = createOwnerInsightSupabaseClient();
  return saveTodayInsightRecord({
    supabase,
    ownerId,
    category,
    periodKey,
    insights,
    snapshot,
  });
}

export async function POST(request: NextRequest) {
  const requester = getRequester(request);

  if (!requester.id || requester.role !== "owner") {
    return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as GenerateRequest;
  const category = body.category;

  if (!isOwnerInsightCategory(category)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }

  const period = normalizePeriod(body.period);
  const periodKey = buildOwnerInsightPeriodKey(period);
  let snapshot: Record<string, unknown> = {};

  try {
    snapshot = await buildOwnerInsightSnapshot(category, period);
    const generatedInsights = await generateGeminiInsights(category, snapshot);
    const insights = sanitizeInsights(generatedInsights, category);

    if (insights.length === 0) {
      const deterministicFallback = buildDeterministicIssueFallback(snapshot);

      if (!deterministicFallback) {
        throw new Error("Gemini did not return valid recommendations.");
      }

      const record = await saveRecommendationRecord({
        ownerId: requester.id,
        category,
        periodKey,
        insights: [deterministicFallback],
        snapshot,
      });

      await logRecommendationActivity({
        ownerId: requester.id,
        ownerName: requester.name,
        category,
        insightCount: 1,
      });

      return NextResponse.json({ record, snapshot, fallback: true });
    }

    const record = await saveRecommendationRecord({
      ownerId: requester.id,
      category,
      periodKey,
      insights,
      snapshot,
    });

    await logRecommendationActivity({
      ownerId: requester.id,
      ownerName: requester.name,
      category,
      insightCount: insights.length,
    });

    return NextResponse.json({ record, snapshot, fallback: false });
  } catch (error) {
    const message = describeUnknownError(
      error,
      "Failed to generate AI recommendations.",
    );
    console.error("Owner AI recommendation generation failed:", error);

    const hasSnapshot = Object.keys(snapshot).length > 0;
    const deterministicFallback = hasSnapshot
      ? buildDeterministicIssueFallback(snapshot)
      : null;

    if (deterministicFallback) {
      try {
        const record = await saveRecommendationRecord({
          ownerId: requester.id,
          category,
          periodKey,
          insights: [deterministicFallback],
          snapshot,
        });

        return NextResponse.json({ record, snapshot, fallback: true });
      } catch (saveError) {
        console.error("Failed to save deterministic fallback:", saveError);
      }
    }

    return NextResponse.json(
      {
        error: message,
        snapshot,
        fallback: true,
        fallbackInsight: hasSnapshot
          ? buildDataSummaryInsight(category, snapshot)
          : undefined,
      },
      { status: 200 },
    );
  }
}
