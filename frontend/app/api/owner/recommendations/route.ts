import { NextRequest, NextResponse } from "next/server";
import {
  buildOwnerInsightPeriodKey,
  createOwnerInsightSupabaseClient,
  buildOwnerInsightSnapshot,
  type OwnerInsightPeriod,
} from "@/lib/services/owner-insights/snapshotService";
import {
  getTodayInsightRecord,
  getTodayInsightRecords,
} from "@/lib/services/owner-insights/storageService";
import {
  buildDataSummaryInsight,
  isOwnerInsightCategory,
} from "@/lib/services/owner-insights/insightSchema";
import { buildDeterministicIssueFallback } from "@/lib/services/owner-insights/allowedIssueInsightGuards";
import { describeUnknownError } from "@/lib/services/owner-insights/errorUtils";

const getRequester = (request: NextRequest) => ({
  id: request.headers.get("x-user-id") ?? "",
  role: request.headers.get("x-user-role") ?? "",
});

const getPeriodFromParams = (searchParams: URLSearchParams): OwnerInsightPeriod | undefined => {
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";
  const validDate = /^\d{4}-\d{2}-\d{2}$/;

  if (!validDate.test(startDate) || !validDate.test(endDate) || startDate > endDate) {
    return undefined;
  }

  return { startDate, endDate };
};

export async function GET(request: NextRequest) {
  const requester = getRequester(request);

  if (!requester.id || requester.role !== "owner") {
    return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const period = getPeriodFromParams(searchParams);
  const periodKey = buildOwnerInsightPeriodKey(period);

  try {
    const supabase = createOwnerInsightSupabaseClient();

    if (category) {
      if (!isOwnerInsightCategory(category)) {
        return NextResponse.json({ error: "Invalid category." }, { status: 400 });
      }

      const record = await getTodayInsightRecord(
        supabase,
        requester.id,
        category,
        periodKey,
      );
      return NextResponse.json({ record });
    }

    const records = await getTodayInsightRecords(supabase, requester.id);
    return NextResponse.json({ records });
  } catch (error) {
    const message = describeUnknownError(
      error,
      "Failed to load recommendations.",
    );

    if (category && isOwnerInsightCategory(category)) {
      const snapshot = await buildOwnerInsightSnapshot(category, period).catch(() => ({}));
      return NextResponse.json(
        {
          error: message,
          fallbackInsight:
            buildDeterministicIssueFallback(snapshot) ??
            buildDataSummaryInsight(category, snapshot),
          snapshot,
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ error: message, records: [] }, { status: 200 });
  }
}
