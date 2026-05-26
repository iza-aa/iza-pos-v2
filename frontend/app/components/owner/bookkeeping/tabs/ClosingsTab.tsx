"use client";

import { useEffect, useMemo, useState } from "react";
import StandardTable, { type StandardTableColumn } from "@/app/components/shared/StandardTable";
import type {
  BookkeepingDashboardData,
  ClosingSection,
  ShiftClosingRow,
} from "@/lib/services/bookkeeping/bookkeepingTypes";
import { getCurrentUser } from "@/lib/utils";
import {
  MetricCard,
  SemanticBadge,
  StandardPanel,
  formatCurrency,
  formatDateTime,
  formatLabel,
} from "../BookkeepingPrimitives";

type ShiftAssignmentRow = {
  id: string;
  staff_id: string;
  shift_id: string;
  work_date: string;
  status: "assigned" | "completed" | "cancelled";
  note?: string | null;
};

type AssignmentStaffOption = {
  id: string;
  name: string;
  staff_code?: string | null;
  role?: string | null;
  shift_id?: string | null;
};

type AssignmentShiftOption = {
  id: string;
  shift_name: string;
  start_time?: string | null;
  end_time?: string | null;
};

export default function ClosingsTab({
  data,
  activeSection,
  generatingShiftClosing = false,
  closingDaily = false,
  reopeningDaily = false,
  savingShiftCashId = "",
  reviewingShiftId = "",
  onGenerateShiftClosing,
  onCloseDaily,
  onReopenDaily,
  onSaveShiftCash,
  onReviewShiftClosing,
}: {
  data: BookkeepingDashboardData;
  activeSection: ClosingSection;
  generatingShiftClosing?: boolean;
  closingDaily?: boolean;
  reopeningDaily?: boolean;
  savingShiftCashId?: string;
  reviewingShiftId?: string;
  onGenerateShiftClosing?: () => void;
  onCloseDaily?: (cashCounted: string, notes: string) => void;
  onReopenDaily?: (businessDate: string, reason: string) => void;
  onSaveShiftCash?: (
    row: ShiftClosingRow,
    cashCounted: string,
    cashDrawer: {
      openingCash: string;
      closingFloat: string;
      floatPolicy: ShiftClosingRow["floatPolicy"];
    },
  ) => void;
  onReviewShiftClosing?: (row: ShiftClosingRow, action: "approve" | "reopen", note: string) => void;
}) {
  const [cashCounted, setCashCounted] = useState("");
  const [notes, setNotes] = useState("");
  const [shiftCashInputs, setShiftCashInputs] = useState<Record<string, string>>({});
  const [shiftOpeningCashInputs, setShiftOpeningCashInputs] = useState<Record<string, string>>({});
  const [shiftClosingFloatInputs, setShiftClosingFloatInputs] = useState<Record<string, string>>({});
  const [shiftFloatPolicyInputs, setShiftFloatPolicyInputs] = useState<Record<string, ShiftClosingRow["floatPolicy"]>>({});
  const [cashModalRow, setCashModalRow] = useState<ShiftClosingRow | null>(null);
  const [reviewModalRow, setReviewModalRow] = useState<ShiftClosingRow | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [assignmentWorkDate, setAssignmentWorkDate] = useState(data.dateRange.endDate);
  const [assignmentStaffId, setAssignmentStaffId] = useState("");
  const [assignmentShiftId, setAssignmentShiftId] = useState("");
  const [assignmentNote, setAssignmentNote] = useState("");
  const [assignments, setAssignments] = useState<ShiftAssignmentRow[]>([]);
  const [assignmentStaff, setAssignmentStaff] = useState<AssignmentStaffOption[]>([]);
  const [assignmentShifts, setAssignmentShifts] = useState<AssignmentShiftOption[]>([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const [assignmentNotice, setAssignmentNotice] = useState("");
  const dailyClosing = data.dailyClosing;
  const closingStatus = dailyClosing?.status ?? "draft";
  const shiftRowsSubmitted = data.shiftClosings.length > 0 && data.shiftClosings.every((row) => (
    row.status === "submitted" || row.status === "closed"
  ));
  const openExceptionCount = dailyClosing?.unresolvedExceptionCount ?? data.summary.unresolvedExceptions;
  const enteredCashCounted = cashCounted === "" ? null : Number(cashCounted);
  const enteredCashDifference = enteredCashCounted === null || !Number.isFinite(enteredCashCounted)
    ? null
    : enteredCashCounted - data.summary.expectedDrawerCash;
  const canCloseCleanly =
    enteredCashCounted !== null &&
    enteredCashDifference === 0 &&
    openExceptionCount === 0 &&
    shiftRowsSubmitted;
  const closingStatusTone =
    closingStatus === "closed"
      ? "success"
      : closingStatus === "ready_to_close"
        ? "info"
        : closingStatus === "needs_review"
          ? "warning"
          : closingStatus === "reopened"
            ? "danger"
            : "neutral";
  const assignmentByStaffId = useMemo(() => {
    return new Map(assignments.map((assignment) => [assignment.staff_id, assignment]));
  }, [assignments]);
  const shiftById = useMemo(() => {
    return new Map(assignmentShifts.map((shift) => [shift.id, shift]));
  }, [assignmentShifts]);

  const loadShiftAssignments = async (workDate: string) => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "owner") return;

    setAssignmentLoading(true);
    setAssignmentError("");

    try {
      const params = new URLSearchParams({ workDate });
      const response = await fetch(`/api/owner/bookkeeping/shift-assignments?${params.toString()}`, {
        headers: {
          "x-user-id": currentUser.id,
          "x-user-name": currentUser.name,
          "x-user-role": currentUser.role,
        },
      });
      const result = (await response.json().catch(() => ({}))) as {
        data?: {
          assignments?: ShiftAssignmentRow[];
          staff?: AssignmentStaffOption[];
          shifts?: AssignmentShiftOption[];
        };
        error?: string;
      };

      if (!response.ok || !result.data) {
        throw new Error(result.error || "Shift assignments could not be loaded.");
      }

      setAssignments(result.data.assignments || []);
      setAssignmentStaff(result.data.staff || []);
      setAssignmentShifts(result.data.shifts || []);
      setAssignmentStaffId((current) => current || result.data?.staff?.[0]?.id || "");
      setAssignmentShiftId((current) => current || result.data?.shifts?.[0]?.id || "");
    } catch (error) {
      setAssignmentError(error instanceof Error ? error.message : "Shift assignments could not be loaded.");
    } finally {
      setAssignmentLoading(false);
    }
  };

  useEffect(() => {
    setAssignmentWorkDate(data.dateRange.endDate);
  }, [data.dateRange.endDate]);

  useEffect(() => {
    if (activeSection !== "shift") return;
    void loadShiftAssignments(assignmentWorkDate);
  }, [activeSection, assignmentWorkDate]);

  const saveShiftAssignment = async () => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "owner") {
      setAssignmentError("Owner access required.");
      return;
    }

    setAssignmentSaving(true);
    setAssignmentError("");
    setAssignmentNotice("");

    try {
      const response = await fetch("/api/owner/bookkeeping/shift-assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
          "x-user-name": currentUser.name,
          "x-user-role": currentUser.role,
        },
        body: JSON.stringify({
          staffId: assignmentStaffId,
          shiftId: assignmentShiftId,
          workDate: assignmentWorkDate,
          status: "assigned",
          note: assignmentNote,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Shift assignment could not be saved.");
      }

      setAssignmentNotice("Shift assignment saved.");
      setAssignmentNote("");
      await loadShiftAssignments(assignmentWorkDate);
    } catch (error) {
      setAssignmentError(error instanceof Error ? error.message : "Shift assignment could not be saved.");
    } finally {
      setAssignmentSaving(false);
    }
  };

  if (activeSection === "daily") {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Gross Sales" value={formatCurrency(data.summary.grossSales)} description="Daily gross sales draft." tone="progress" />
          <MetricCard label="Net Sales" value={formatCurrency(data.summary.netSales)} description="Daily net sales draft." tone="success" />
          <MetricCard label="Cash Sales" value={formatCurrency(data.summary.cashExpected)} description="Cash from paid orders only." tone="waiting" />
          <MetricCard label="Expected Drawer" value={formatCurrency(data.summary.expectedDrawerCash)} description="Opening cash plus cash sales." tone="progress" />
          <MetricCard
            label="Closing Status"
            value={formatLabel(closingStatus)}
            description={dailyClosing?.approvedAt ? `Approved ${formatDateTime(dailyClosing.approvedAt)}` : "Waiting for owner closing."}
            tone={closingStatusTone}
          />
        </div>

        <StandardPanel
          title="Daily Closing Draft"
          description="Final owner checkpoint. Close the day only after shift cash counts match, exceptions are clear, and the cash count is entered."
          action={
            <div className="flex flex-wrap gap-2">
              {dailyClosing?.status === "closed" ? (
                <button
                  type="button"
                  onClick={() => onReopenDaily?.(dailyClosing.businessDate, notes)}
                  disabled={!onReopenDaily || reopeningDaily}
                  className="rounded-xl border border-[#F7B8C3] bg-white px-4 py-3 text-sm font-bold text-[#BE123C] shadow-sm transition hover:bg-[#FFF1F2] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {reopeningDaily ? "Reopening..." : "Reopen Daily"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onCloseDaily?.(cashCounted, notes)}
                  disabled={!onCloseDaily || closingDaily}
                  className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                >
                  {closingDaily ? "Closing Daily..." : "Close Daily"}
                </button>
              )}
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-bold text-gray-500">Current State</p>
              <p className="mt-2 text-lg font-bold text-gray-950">{formatLabel(closingStatus)}</p>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                {dailyClosing
                  ? "This closing is stored as an immutable bookkeeping snapshot for this business date."
                  : "This draft is calculated from live operational data and can be closed by the owner."}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-bold text-gray-500">Closing Checks</p>
              <p className="mt-2 text-lg font-bold text-gray-950">
                {openExceptionCount} open exception(s)
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                Cash difference: {dailyClosing?.cashDifference === null || dailyClosing?.cashDifference === undefined
                  ? "-"
                  : formatCurrency(dailyClosing.cashDifference)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-bold text-gray-500">Cash Counted</p>
              <p className="mt-2 text-lg font-bold text-gray-950">
                {dailyClosing?.cashCounted === null || dailyClosing?.cashCounted === undefined
                  ? "-"
                  : formatCurrency(dailyClosing.cashCounted)}
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-500">Submitted counted cash for this closing.</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-bold text-gray-500">Owner Note</p>
              <p className="mt-2 text-lg font-bold text-gray-950">{dailyClosing?.notes || "-"}</p>
              <p className="mt-2 text-sm leading-6 text-gray-500">Optional note attached to the closing.</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 md:col-span-2">
              <p className="text-sm font-bold text-gray-500">Ready To Close Checklist</p>
              <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-600 md:grid-cols-2">
                <p>{shiftRowsSubmitted ? "Pass" : "Needs review"} - Shift closings submitted or closed</p>
                <p>{openExceptionCount === 0 ? "Pass" : "Needs review"} - No open exceptions</p>
                <p>{enteredCashCounted !== null ? "Pass" : "Needs review"} - Cash counted entered</p>
                <p>{enteredCashDifference === 0 ? "Pass" : "Needs review"} - Cash counted matches expected drawer</p>
              </div>
              {!canCloseCleanly && dailyClosing?.status !== "closed" ? (
                <p className="mt-3 text-sm leading-6 text-amber-700">
                  Saving is allowed, but the status will remain Needs Review until every check is clear.
                </p>
              ) : null}
            </div>
            <label className="text-sm font-semibold text-gray-700">
              Cash Counted
              <input
                type="number"
                min="0"
                value={cashCounted}
                onChange={(event) => setCashCounted(event.target.value)}
                placeholder="Enter counted cash"
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
              />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Closing Notes
              <input
                type="text"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional"
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
              />
            </label>
          </div>
        </StandardPanel>
      </div>
    );
  }

  const columns: Array<StandardTableColumn<ShiftClosingRow>> = [
    {
      key: "shiftName",
      header: "Shift",
      render: (row) => <span className="font-semibold text-gray-900">{row.shiftName}</span>,
    },
    {
      key: "businessDate",
      header: "Business Date",
      render: (row) => row.businessDate,
    },
    {
      key: "grossSales",
      header: "Gross Sales",
      render: (row) => formatCurrency(row.grossSales),
      sortValue: (row) => row.grossSales,
    },
    {
      key: "discountTotal",
      header: "Discounts",
      render: (row) => formatCurrency(row.discountTotal),
      sortValue: (row) => row.discountTotal,
    },
    {
      key: "netSales",
      header: "Net Sales",
      render: (row) => <span className="font-semibold text-gray-900">{formatCurrency(row.netSales)}</span>,
      sortValue: (row) => row.netSales,
    },
    {
      key: "cashExpected",
      header: "Cash Sales",
      render: (row) => formatCurrency(row.cashExpected),
      sortValue: (row) => row.cashExpected,
    },
    {
      key: "openingCash",
      header: "Opening Cash",
      render: (row) => formatCurrency(row.openingCash),
      sortValue: (row) => row.openingCash,
    },
    {
      key: "expectedDrawerCash",
      header: "Expected Drawer",
      render: (row) => <span className="font-semibold text-gray-900">{formatCurrency(row.expectedDrawerCash)}</span>,
      sortValue: (row) => row.expectedDrawerCash,
    },
    {
      key: "cashCounted",
      header: "Cash Counted",
      render: (row) => row.cashCounted === null || row.cashCounted === undefined
        ? "-"
        : formatCurrency(row.cashCounted),
      sortValue: (row) => row.cashCounted ?? 0,
    },
    {
      key: "cashDifference",
      header: "Drawer Diff",
      render: (row) => row.cashDifference === null || row.cashDifference === undefined
        ? "-"
        : formatCurrency(row.cashDifference),
      sortValue: (row) => row.cashDifference ?? 0,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const tone =
          row.status === "closed"
            ? "success"
            : row.status === "submitted"
              ? "info"
              : row.status === "needs_review"
                ? "warning"
                : row.status === "reopened"
                  ? "danger"
                  : "neutral";

        return (
          <SemanticBadge tone={tone}>
            {formatLabel(row.status)}
          </SemanticBadge>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      isAction: true,
      render: (row) => {
        const isLocked = row.status === "closed";

        return (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShiftCashInputs((current) => ({
                  ...current,
                  [row.id]: current[row.id] ?? (row.cashCounted === null || row.cashCounted === undefined ? "" : String(row.cashCounted)),
                }));
                setShiftOpeningCashInputs((current) => ({
                  ...current,
                  [row.id]: current[row.id] ?? String(row.openingCash),
                }));
                setShiftClosingFloatInputs((current) => ({
                  ...current,
                  [row.id]: current[row.id] ?? String(row.closingFloat),
                }));
                setShiftFloatPolicyInputs((current) => ({
                  ...current,
                  [row.id]: current[row.id] ?? row.floatPolicy,
                }));
                setCashModalRow(row);
              }}
              disabled={!onSaveShiftCash || isLocked || savingShiftCashId === row.id}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingShiftCashId === row.id ? "Saving..." : "Cash Count"}
            </button>
            <button
              type="button"
              onClick={() => {
                setReviewNote("");
                setReviewModalRow(row);
              }}
              disabled={!onReviewShiftClosing || reviewingShiftId === row.id}
              className="rounded-xl bg-gray-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
            >
              {reviewingShiftId === row.id ? "Reviewing..." : "Review"}
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <StandardPanel
        title="Daily Shift Assignment"
        description="Assign staff to the actual shift for a business date. End Shift uses this dated assignment first, then falls back to the staff default shift."
        action={
          <button
            type="button"
            onClick={() => void loadShiftAssignments(assignmentWorkDate)}
            disabled={assignmentLoading}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm transition hover:border-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {assignmentLoading ? "Loading..." : "Refresh Assignments"}
          </button>
        }
      >
        {assignmentError ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {assignmentError}
          </div>
        ) : null}
        {assignmentNotice ? (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-700">
            {assignmentNotice}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[180px_1fr_1fr_1.2fr_auto]">
          <label className="text-sm font-semibold text-gray-700">
            Work Date
            <input
              type="date"
              value={assignmentWorkDate}
              onChange={(event) => {
                setAssignmentWorkDate(event.target.value);
                setAssignmentNotice("");
              }}
              className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
            />
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Staff
            <select
              value={assignmentStaffId}
              onChange={(event) => setAssignmentStaffId(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
            >
              {assignmentStaff.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name}{staff.staff_code ? ` - ${staff.staff_code}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Shift
            <select
              value={assignmentShiftId}
              onChange={(event) => setAssignmentShiftId(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
            >
              {assignmentShifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.shift_name} ({String(shift.start_time || "--:--").slice(0, 5)} - {String(shift.end_time || "--:--").slice(0, 5)})
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Note
            <input
              type="text"
              value={assignmentNote}
              onChange={(event) => setAssignmentNote(event.target.value)}
              placeholder="Optional"
              className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void saveShiftAssignment()}
              disabled={assignmentSaving || !assignmentStaffId || !assignmentShiftId || !assignmentWorkDate}
              className="h-11 w-full rounded-xl bg-gray-900 px-4 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 lg:w-auto"
            >
              {assignmentSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
          <div className="grid grid-cols-1 gap-0 bg-gray-50 text-sm md:grid-cols-3">
            {assignmentStaff.map((staff) => {
              const assignment = assignmentByStaffId.get(staff.id);
              const assignedShift = assignment ? shiftById.get(assignment.shift_id) : null;

              return (
                <div key={staff.id} className="border-b border-gray-200 p-4 md:border-r">
                  <p className="font-bold text-gray-950">{staff.name}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-normal text-gray-500">
                    {staff.staff_code || staff.role || "Staff"}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-gray-700">
                    {assignedShift
                      ? `${assignedShift.shift_name} (${String(assignedShift.start_time || "--:--").slice(0, 5)} - ${String(assignedShift.end_time || "--:--").slice(0, 5)})`
                      : "No dated assignment"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </StandardPanel>

      <StandardPanel
        title="Shift Closing Drafts"
        description="Automatic shift-level draft from selected operational data. Submitted and closed rows are protected from regenerate updates."
        action={
          <button
            type="button"
            onClick={onGenerateShiftClosing}
            disabled={!onGenerateShiftClosing || generatingShiftClosing}
            className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
          >
            {generatingShiftClosing ? "Generating Shift Closing..." : "Generate Shift Closing"}
          </button>
        }
      >
        <StandardTable
          columns={columns}
          data={data.shiftClosings}
          getRowKey={(row) => row.id}
          emptyLabel="No shift closing draft in this period."
          minWidthClassName="min-w-[1280px]"
        />
      </StandardPanel>
      {cashModalRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-950">Shift Cash Count</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {cashModalRow.shiftName} - {cashModalRow.businessDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCashModalRow(null)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 transition hover:border-gray-900 hover:text-gray-900"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="font-semibold text-gray-500">Cash Sales</span>
                <span className="font-bold text-gray-950">{formatCurrency(cashModalRow.cashExpected)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="font-semibold text-gray-500">Expected Drawer</span>
                <span className="font-bold text-gray-950">
                  {formatCurrency(
                    Number(shiftOpeningCashInputs[cashModalRow.id] ?? cashModalRow.openingCash) +
                    cashModalRow.cashExpected,
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="font-semibold text-gray-500">Current Counted</span>
                <span className="font-bold text-gray-950">
                  {cashModalRow.cashCounted === null || cashModalRow.cashCounted === undefined
                    ? "-"
                    : formatCurrency(cashModalRow.cashCounted)}
                </span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-gray-700">
                Opening Cash
                <input
                  type="number"
                  min="0"
                  value={shiftOpeningCashInputs[cashModalRow.id] ?? ""}
                  onChange={(event) => setShiftOpeningCashInputs((current) => ({
                    ...current,
                    [cashModalRow.id]: event.target.value,
                  }))}
                  placeholder="Drawer float at shift start"
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
                />
              </label>
              <label className="block text-sm font-semibold text-gray-700">
                Closing Float
                <input
                  type="number"
                  min="0"
                  value={shiftClosingFloatInputs[cashModalRow.id] ?? ""}
                  onChange={(event) => setShiftClosingFloatInputs((current) => ({
                    ...current,
                    [cashModalRow.id]: event.target.value,
                  }))}
                  placeholder="Cash left for next shift"
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
                />
              </label>
            </div>
            <label className="mt-5 block text-sm font-semibold text-gray-700">
              Float Policy
              <select
                value={shiftFloatPolicyInputs[cashModalRow.id] ?? cashModalRow.floatPolicy}
                onChange={(event) => setShiftFloatPolicyInputs((current) => ({
                  ...current,
                  [cashModalRow.id]: event.target.value as ShiftClosingRow["floatPolicy"],
                }))}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
              >
                <option value="carry_float">Carry float to next shift</option>
                <option value="new_float">Use new float from owner</option>
                <option value="deposit_all">Deposit all cash</option>
              </select>
            </label>

            <label className="mt-5 block text-sm font-semibold text-gray-700">
              Cash Counted
              <input
                type="number"
                min="0"
                value={shiftCashInputs[cashModalRow.id] ?? ""}
                onChange={(event) => setShiftCashInputs((current) => ({
                  ...current,
                  [cashModalRow.id]: event.target.value,
                }))}
                placeholder="Enter counted cash"
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
                autoFocus
              />
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCashModalRow(null)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition hover:border-gray-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const value = shiftCashInputs[cashModalRow.id] ?? "";
                  onSaveShiftCash?.(cashModalRow, value, {
                    openingCash: shiftOpeningCashInputs[cashModalRow.id] ?? String(cashModalRow.openingCash),
                    closingFloat: shiftClosingFloatInputs[cashModalRow.id] ?? String(cashModalRow.closingFloat),
                    floatPolicy: shiftFloatPolicyInputs[cashModalRow.id] ?? cashModalRow.floatPolicy,
                  });
                  setCashModalRow(null);
                }}
                disabled={
                  !onSaveShiftCash ||
                  savingShiftCashId === cashModalRow.id ||
                  (shiftCashInputs[cashModalRow.id] ?? "") === "" ||
                  Number(shiftCashInputs[cashModalRow.id] ?? "") < 0 ||
                  Number(shiftOpeningCashInputs[cashModalRow.id] ?? "0") < 0 ||
                  Number(shiftClosingFloatInputs[cashModalRow.id] ?? "0") < 0
                }
                className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
              >
                {savingShiftCashId === cashModalRow.id ? "Saving..." : "Save Cash Count"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {reviewModalRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-950">Review Shift Closing</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {reviewModalRow.shiftName} - {reviewModalRow.businessDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalRow(null)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 transition hover:border-gray-900 hover:text-gray-900"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm md:grid-cols-2">
              <div>
                <p className="font-semibold text-gray-500">Expected Drawer</p>
                <p className="mt-1 font-bold text-gray-950">{formatCurrency(reviewModalRow.expectedDrawerCash)}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-500">Cash Counted</p>
                <p className="mt-1 font-bold text-gray-950">
                  {reviewModalRow.cashCounted === null || reviewModalRow.cashCounted === undefined
                    ? "-"
                    : formatCurrency(reviewModalRow.cashCounted)}
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-500">Cash Difference</p>
                <p className="mt-1 font-bold text-gray-950">
                  {reviewModalRow.cashDifference === null || reviewModalRow.cashDifference === undefined
                    ? "-"
                    : formatCurrency(reviewModalRow.cashDifference)}
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-500">Current Status</p>
                <p className="mt-1 font-bold text-gray-950">{formatLabel(reviewModalRow.status)}</p>
              </div>
            </div>

            <label className="mt-5 block text-sm font-semibold text-gray-700">
              Owner Review Note
              <textarea
                value={reviewNote}
                onChange={(event) => setReviewNote(event.target.value)}
                placeholder="Optional note for audit trail"
                rows={4}
                className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
              />
            </label>

            <div className="mt-5 flex flex-col justify-end gap-2 sm:flex-row">
              {reviewModalRow.status === "closed" ? (
                <button
                  type="button"
                  onClick={() => {
                    onReviewShiftClosing?.(reviewModalRow, "reopen", reviewNote);
                    setReviewModalRow(null);
                  }}
                  disabled={!onReviewShiftClosing || reviewingShiftId === reviewModalRow.id}
                  className="rounded-xl border border-[#F7B8C3] bg-white px-4 py-3 text-sm font-bold text-[#BE123C] transition hover:bg-[#FFF1F2] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {reviewingShiftId === reviewModalRow.id ? "Reopening..." : "Reopen Shift"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onReviewShiftClosing?.(reviewModalRow, "approve", reviewNote);
                    setReviewModalRow(null);
                  }}
                  disabled={
                    !onReviewShiftClosing ||
                    reviewingShiftId === reviewModalRow.id ||
                    reviewModalRow.cashCounted === null ||
                    reviewModalRow.cashCounted === undefined
                  }
                  className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                >
                  {reviewingShiftId === reviewModalRow.id ? "Approving..." : "Approve & Close Shift"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setReviewModalRow(null)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition hover:border-gray-900"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
