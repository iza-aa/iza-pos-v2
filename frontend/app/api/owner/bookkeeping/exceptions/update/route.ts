import { NextRequest, NextResponse } from "next/server";
import {
  assertBookkeepingDatesAreOpen,
  createBookkeepingSupabaseClient,
} from "@/lib/services/bookkeeping/bookkeepingServer";

type UpdateExceptionRequest = {
  id?: string;
  status?: "acknowledged" | "resolved";
  note?: string;
  exception?: {
    businessDate?: string;
    severity?: "low" | "medium" | "high";
    type?: string;
    description?: string;
    source?: string;
    suggestedFix?: string;
  };
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

  const body = (await request.json().catch(() => ({}))) as UpdateExceptionRequest;

  if (!body.id || (body.status !== "acknowledged" && body.status !== "resolved")) {
    return NextResponse.json({ error: "Valid exception id and status are required." }, { status: 400 });
  }

  try {
    const supabase = createBookkeepingSupabaseClient();
    const payload = {
      status: body.status,
      note: body.note || null,
      resolved_by: body.status === "resolved" ? requester.id : null,
      resolved_at: body.status === "resolved" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    const { data: byId, error: byIdError } = await supabase
      .from("bookkeeping_exceptions")
      .select("id, business_date")
      .eq("id", body.id)
      .maybeSingle();

    if (byIdError) throw byIdError;

    const { data: bySourceId, error: bySourceIdError } = byId?.id
        ? { data: null, error: null }
        : await supabase
            .from("bookkeeping_exceptions")
          .select("id, business_date")
          .eq("source_id", body.id)
          .maybeSingle();

    if (bySourceIdError) throw bySourceIdError;

    const targetId = byId?.id || bySourceId?.id;
    const targetDate = String(
      byId?.business_date ||
      bySourceId?.business_date ||
      body.exception?.businessDate ||
      new Date().toISOString().slice(0, 10),
    );

    await assertBookkeepingDatesAreOpen({
      supabase,
      dates: [targetDate],
      action: "Updating exception",
    });

    if (targetId) {
      const { error } = await supabase
        .from("bookkeeping_exceptions")
        .update(payload)
        .eq("id", targetId);

      if (error) throw error;
    } else {
      const exception = body.exception;
      const { error } = await supabase
        .from("bookkeeping_exceptions")
        .insert({
          business_date: exception?.businessDate || new Date().toISOString().slice(0, 10),
          severity: exception?.severity || "medium",
          type: exception?.type || "Bookkeeping Exception",
          description: exception?.description || "Bookkeeping exception was reviewed from live dashboard data.",
          source_table: null,
          source_id: body.id,
          suggested_fix: exception?.suggestedFix || "Review the related bookkeeping data.",
          ...payload,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;
    }

    await supabase.from("activity_logs").insert({
      user_id: requester.id,
      user_name: requester.name,
      user_role: "owner",
      action: "UPDATE",
      action_category: "FINANCIAL",
      action_description: `Marked bookkeeping exception as ${body.status}`,
      resource_type: "Bookkeeping Exception",
      resource_id: body.id,
      resource_name: body.id,
      previous_value: null,
      new_value: { status: body.status, note: body.note || null },
      changes_summary: [`Exception marked as ${body.status}`],
      severity: "info",
      tags: ["bookkeeping", "exception"],
      notes: body.note || null,
      is_reversible: false,
      ip_address: "0.0.0.0",
      device_info: "Server API",
      session_id: `bookkeeping-${requester.id}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update bookkeeping exception:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "Bookkeeping exception could not be updated.",
      },
      { status: 500 },
    );
  }
}
