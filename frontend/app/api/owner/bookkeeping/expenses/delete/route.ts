import { NextRequest, NextResponse } from "next/server";
import {
  assertBookkeepingDatesAreOpen,
  createBookkeepingSupabaseClient,
} from "@/lib/services/bookkeeping/bookkeepingServer";

type DeleteExpenseRequest = {
  id?: string;
};

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

  const body = (await request.json().catch(() => ({}))) as DeleteExpenseRequest;
  if (!body.id) {
    return NextResponse.json({ error: "Expense id is required." }, { status: 400 });
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
      dates: [String(existingExpense?.expense_date || "")],
      action: "Deleting expense",
    });

    const { error } = await supabase
      .from("bookkeeping_expenses")
      .delete()
      .eq("id", body.id);

    if (error) throw error;

    await supabase.from("activity_logs").insert({
      user_id: requester.id,
      user_name: requester.name,
      user_role: "owner",
      action: "DELETE",
      action_category: "FINANCIAL",
      action_description: "Deleted bookkeeping expense",
      resource_type: "Bookkeeping Expense",
      resource_id: body.id,
      resource_name: "Expense",
      previous_value: { id: body.id },
      new_value: null,
      changes_summary: ["Deleted bookkeeping expense"],
      severity: "warning",
      tags: ["bookkeeping", "expense"],
      notes: null,
      is_reversible: false,
      ip_address: "0.0.0.0",
      device_info: "Server API",
      session_id: `bookkeeping-${requester.id}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete bookkeeping expense:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "Bookkeeping expense could not be deleted.",
      },
      { status: 500 },
    );
  }
}
