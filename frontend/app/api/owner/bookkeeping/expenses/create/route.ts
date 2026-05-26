import { NextRequest, NextResponse } from "next/server";
import {
  assertBookkeepingDatesAreOpen,
  createBookkeepingSupabaseClient,
} from "@/lib/services/bookkeeping/bookkeepingServer";

type CreateExpenseRequest = {
  expenseDate?: string;
  category?: string;
  amount?: number | string;
  paymentMethod?: string;
  vendor?: string;
  receiptUrl?: string;
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

  const body = (await request.json().catch(() => ({}))) as CreateExpenseRequest;
  const amount = Number(body.amount ?? 0);
  const expenseDate = body.expenseDate ?? "";
  const category = String(body.category ?? "").trim();

  if (!DATE_PATTERN.test(expenseDate)) {
    return NextResponse.json({ error: "Valid expense date is required." }, { status: 400 });
  }

  if (!category || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Expense category and amount are required." }, { status: 400 });
  }

  try {
    const supabase = createBookkeepingSupabaseClient();
    await assertBookkeepingDatesAreOpen({
      supabase,
      dates: [expenseDate],
      action: "Creating expense",
    });

    const { data, error } = await supabase
      .from("bookkeeping_expenses")
      .insert({
        expense_date: expenseDate,
        category,
        amount,
        payment_method: body.paymentMethod || null,
        vendor: body.vendor || null,
        receipt_url: body.receiptUrl || null,
        note: body.note || null,
        created_by: requester.id,
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
      action_description: `Created bookkeeping expense ${category}`,
      resource_type: "Bookkeeping Expense",
      resource_id: data?.id ?? expenseDate,
      resource_name: category,
      previous_value: null,
      new_value: { expenseDate, category, amount },
      changes_summary: [`Created ${category} expense for ${amount}`],
      severity: "info",
      tags: ["bookkeeping", "expense"],
      notes: null,
      is_reversible: false,
      ip_address: "0.0.0.0",
      device_info: "Server API",
      session_id: `bookkeeping-${requester.id}`,
    });

    return NextResponse.json({ success: true, id: data?.id });
  } catch (error) {
    console.error("Failed to create bookkeeping expense:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "Bookkeeping expense could not be created.",
      },
      { status: 500 },
    );
  }
}
