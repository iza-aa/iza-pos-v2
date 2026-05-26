import { NextRequest, NextResponse } from "next/server";
import {
  assertBookkeepingDatesAreOpen,
  createBookkeepingSupabaseClient,
} from "@/lib/services/bookkeeping/bookkeepingServer";

type CreateAdjustmentRequest = {
  businessDate?: string;
  category?: string;
  amount?: number | string;
  direction?: "in" | "out" | "neutral";
  paymentMethod?: string;
  sourceLabel?: string;
  note?: string;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const getRequester = (request: NextRequest) => ({
  id: request.headers.get("x-user-id") ?? "",
  name: request.headers.get("x-user-name") ?? "Owner",
  role: request.headers.get("x-user-role") ?? "",
});

export async function POST(request: NextRequest) {
  const requester = getRequester(request);

  if (!requester.id || requester.role !== "owner") {
    return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as CreateAdjustmentRequest;
  const businessDate = body.businessDate ?? "";
  const category = String(body.category || "Manual Adjustment").trim();
  const amount = Number(body.amount ?? 0);
  const direction = body.direction;
  const sourceLabel = String(body.sourceLabel || "Manual owner adjustment").trim();
  const note = String(body.note || "").trim();

  if (!DATE_PATTERN.test(businessDate)) {
    return NextResponse.json({ error: "Valid business date is required." }, { status: 400 });
  }

  if (!category || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Adjustment category and amount are required." }, { status: 400 });
  }

  if (direction !== "in" && direction !== "out" && direction !== "neutral") {
    return NextResponse.json({ error: "Adjustment direction is required." }, { status: 400 });
  }

  if (!note) {
    return NextResponse.json({ error: "Adjustment note is required for audit trail." }, { status: 400 });
  }

  try {
    const supabase = createBookkeepingSupabaseClient();
    await assertBookkeepingDatesAreOpen({
      supabase,
      dates: [businessDate],
      action: "Creating manual adjustment",
    });

    const sourceId = `manual-adjustment-${businessDate}-${Date.now()}`;
    const { data, error } = await supabase
      .from("bookkeeping_entries")
      .insert({
        business_date: businessDate,
        entry_at: new Date().toISOString(),
        type: "manual_adjustment",
        category,
        amount,
        direction,
        payment_method: body.paymentMethod || null,
        source_table: "manual_adjustment",
        source_id: sourceId,
        source_label: sourceLabel,
        status: "posted",
        note,
        created_by: requester.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) throw error;

    await supabase.from("activity_logs").insert({
      user_id: requester.id,
      user_name: requester.name,
      user_role: "owner",
      action: "CREATE",
      action_category: "FINANCIAL",
      action_description: `Created manual bookkeeping adjustment ${category}`,
      resource_type: "Bookkeeping Manual Adjustment",
      resource_id: data?.id ?? sourceId,
      resource_name: category,
      previous_value: null,
      new_value: { businessDate, category, amount, direction, sourceLabel, note },
      changes_summary: [`Created ${direction} adjustment for ${amount}`],
      severity: direction === "neutral" ? "info" : "warning",
      tags: ["bookkeeping", "ledger", "manual-adjustment"],
      notes: note,
      is_reversible: false,
      ip_address: "0.0.0.0",
      device_info: "Server API",
      session_id: `bookkeeping-${requester.id}`,
    });

    return NextResponse.json({ success: true, id: data?.id });
  } catch (error) {
    console.error("Failed to create manual adjustment:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "Manual adjustment could not be created.",
      },
      { status: 500 },
    );
  }
}
