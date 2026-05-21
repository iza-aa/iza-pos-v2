import { NextRequest, NextResponse } from "next/server";
import {
  buildOwnerInsightSnapshot,
  createOwnerInsightSupabaseClient,
} from "@/lib/services/owner-insights/snapshotService";
import { generateGeminiInsights } from "@/lib/services/owner-insights/geminiInsightService";
import {
  buildDataSummaryInsight,
  isOwnerInsightCategory,
  sanitizeInsights,
} from "@/lib/services/owner-insights/insightSchema";
import { saveTodayInsightRecord } from "@/lib/services/owner-insights/storageService";

type GenerateRequest = {
  category?: string;
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

  const snapshot = await buildOwnerInsightSnapshot(category);

  try {
    const generatedInsights = await generateGeminiInsights(category, snapshot);
    const insights = sanitizeInsights(generatedInsights, category);

    if (insights.length === 0) {
      throw new Error("Gemini did not return valid recommendations.");
    }

    const supabase = createOwnerInsightSupabaseClient();
    const record = await saveTodayInsightRecord({
      supabase,
      ownerId: requester.id,
      category,
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
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate AI recommendations.";

    return NextResponse.json(
      {
        error: message,
        snapshot,
        fallback: true,
        fallbackInsight: buildDataSummaryInsight(category, snapshot),
      },
      { status: 200 },
    );
  }
}
