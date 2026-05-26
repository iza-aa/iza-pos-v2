import { NextRequest, NextResponse } from "next/server";
import {
  assertBookkeepingDatesAreOpen,
  createBookkeepingSupabaseClient,
} from "@/lib/services/bookkeeping/bookkeepingServer";

type UpdateExpenseRequest = {
  id?: string;
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

  const body = (await request.json().catch(() => ({}))) as UpdateExpenseRequest;
  const amount = Number(body.amount ?? 0);
  const expenseDate = body.expenseDate ?? "";
  const category = String(body.category ?? "").trim();

  if (!body.id || !DATE_PATTERN.test(expenseDate)) {
    return NextResponse.json({ error: "Valid expense id and date are required." }, { status: 400 });
  }

  if (!category || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Expense category and amount are required." }, { status: 400 });
  }

  try {
    const supabase = createBookkeepingSupabaseClient();
    const { data: existingExpense, error: existingError } = await supabase
      .from("bookkeeping_expenses")
      .select("expense_date")
      .eq("id", body.id)
      .maybeSingle();

    if (existingError) throw existingError;

    await assertBookkeepingDatesAreOpen({
      supabase,
      dates: [String(existingExpense?.expense_date || ""), expenseDate],
      action: "Updating expense",
    });

    const { error } = await supabase
      .from("bookkeeping_expenses")
      .update({
        expense_date: expenseDate,
        category,
        amount,
        payment_method: body.paymentMethod || null,
        vendor: body.vendor || null,
        receipt_url: body.receiptUrl || null,
        note: body.note || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.id);

    if (error) throw error;

    await supabase.from("activity_logs").insert({
      user_id: requester.id,
      user_name: requester.name,
      user_role: "owner",
      action: "UPDATE",
      action_category: "FINANCIAL",
      action_description: `Updated bookkeeping expense ${category}`,
      resource_type: "Bookkeeping Expense",
      resource_id: body.id,
      resource_name: category,
      previous_value: null,
      new_value: { expenseDate, category, amount },
      changes_summary: [`Updated ${category} expense for ${amount}`],
      severity: "info",
      tags: ["bookkeeping", "expense"],
      notes: null,
      is_reversible: false,
      ip_address: "0.0.0.0",
      device_info: "Server API",
      session_id: `bookkeeping-${requester.id}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update bookkeeping expense:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "Bookkeeping expense could not be updated.",
      },
      { status: 500 },
    );
  }
}
