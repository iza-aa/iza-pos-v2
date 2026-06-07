import { NextRequest, NextResponse } from "next/server";
import {
  assertBookkeepingDatesAreOpen,
  createBookkeepingSupabaseClient,
} from "@/lib/services/bookkeeping/bookkeepingServer";
import { getJakartaTodayDate } from "@/lib/services/bookkeeping/bookkeepingDate";

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
    const correctionId = body.id.startsWith("order-correction-")
      ? body.id.replace("order-correction-", "")
      : "";

    if (correctionId) {
      const reviewedAt = new Date().toISOString();
      const { data: correction, error: correctionError } = await supabase
        .from("order_corrections")
        .update({
          status: "reviewed",
          reviewed_by: requester.id,
          reviewed_by_name: requester.name,
          reviewed_by_role: "owner",
          reviewed_at: reviewedAt,
          review_note: body.note || `Owner marked as ${body.status}.`,
        })
        .eq("id", correctionId)
        .select("id")
        .maybeSingle();

      if (correctionError) throw correctionError;

      const { data: storedException, error: storedExceptionError } = await supabase
        .from("bookkeeping_exceptions")
        .select("id")
        .eq("source_id", correctionId)
        .maybeSingle();

      if (storedExceptionError) throw storedExceptionError;

      if (storedException?.id) {
        const { error } = await supabase
          .from("bookkeeping_exceptions")
          .update(payload)
          .eq("id", storedException.id);

        if (error) throw error;
      }

      if (correction?.id || storedException?.id) {
        await supabase.from("activity_logs").insert({
          user_id: requester.id,
          user_name: requester.name,
          user_role: "owner",
          action: "UPDATE",
          action_category: "FINANCIAL",
          action_description: `Marked order correction review as ${body.status}`,
          resource_type: "Order Correction",
          resource_id: correctionId,
          resource_name: correctionId,
          previous_value: null,
          new_value: { status: body.status, note: body.note || null },
          changes_summary: [`Order correction review marked as ${body.status}`],
          severity: "info",
          tags: ["bookkeeping", "exception", "order-correction"],
          notes: body.note || null,
          is_reversible: false,
          ip_address: "0.0.0.0",
          device_info: "Server API",
          session_id: `bookkeeping-${requester.id}`,
        });

        return NextResponse.json({ success: true });
      }
    }

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
      getJakartaTodayDate(),
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
          business_date: exception?.businessDate || getJakartaTodayDate(),
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
