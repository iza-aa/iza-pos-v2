import { NextRequest, NextResponse } from "next/server";
import {
  createOwnerInsightSupabaseClient,
  buildOwnerInsightSnapshot,
} from "@/lib/services/owner-insights/snapshotService";
import {
  getTodayInsightRecord,
  getTodayInsightRecords,
} from "@/lib/services/owner-insights/storageService";
import {
  buildDataSummaryInsight,
  isOwnerInsightCategory,
} from "@/lib/services/owner-insights/insightSchema";

const getRequester = (request: NextRequest) => ({
  id: request.headers.get("x-user-id") ?? "",
  role: request.headers.get("x-user-role") ?? "",
});

export async function GET(request: NextRequest) {
  const requester = getRequester(request);

  if (!requester.id || requester.role !== "owner") {
    return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  try {
    const supabase = createOwnerInsightSupabaseClient();

    if (category) {
      if (!isOwnerInsightCategory(category)) {
        return NextResponse.json({ error: "Invalid category." }, { status: 400 });
      }

      const record = await getTodayInsightRecord(supabase, requester.id, category);
      return NextResponse.json({ record });
    }

    const records = await getTodayInsightRecords(supabase, requester.id);
    return NextResponse.json({ records });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load recommendations.";

    if (category && isOwnerInsightCategory(category)) {
      const snapshot = await buildOwnerInsightSnapshot(category).catch(() => ({}));
      return NextResponse.json(
        {
          error: message,
          fallbackInsight: buildDataSummaryInsight(category, snapshot),
          snapshot,
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ error: message, records: [] }, { status: 200 });
  }
}
