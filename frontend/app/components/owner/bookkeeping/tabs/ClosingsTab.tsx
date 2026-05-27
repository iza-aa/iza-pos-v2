"use client";

import { useMemo, useState } from "react";
import StandardTable, { type StandardTableColumn } from "@/app/components/shared/StandardTable";
import type {
  BookkeepingDashboardData,
  ShiftClosingRow,
} from "@/lib/services/bookkeeping/bookkeepingTypes";
import {
  MetricCard,
  SemanticBadge,
  StandardPanel,
  formatCurrency,
  formatDateTime,
  formatLabel,
} from "../BookkeepingPrimitives";

const hasCashCount = (row: ShiftClosingRow) => row.cashCounted !== null && row.cashCounted !== undefined;

const getCashDifference = (row: ShiftClosingRow) => (
  row.cashDifference ?? ((row.cashCounted ?? 0) - row.expectedDrawerCash)
);

const needsManagerReview = (row: ShiftClosingRow) => (
  row.status === "needs_review" ||
  row.status === "reopened" ||
  (hasCashCount(row) && getCashDifference(row) !== 0)
);

export default function ClosingsTab({
  data,
  closingDaily = false,
  reopeningDaily = false,
  reviewingShiftId = "",
  onApproveDaily,
  onReopenDaily,
  onRequestShiftReview,
}: {
  data: BookkeepingDashboardData;
  closingDaily?: boolean;
  reopeningDaily?: boolean;
  reviewingShiftId?: string;
  onApproveDaily?: (notes: string) => void;
  onReopenDaily?: (businessDate: string, reason: string) => void;
  onRequestShiftReview?: (row: ShiftClosingRow, note: string) => void;
}) {
  const [ownerNote, setOwnerNote] = useState("");
  const [reviewModalRow, setReviewModalRow] = useState<ShiftClosingRow | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const dailyClosing = data.dailyClosing;
  const closingBusinessDate = data.dateRange.endDate;
  const shiftRows = data.shiftClosings.filter((row) => row.businessDate === closingBusinessDate);
  const openExceptionCount = dailyClosing?.unresolvedExceptionCount ?? data.exceptions.filter(
    (exception) => exception.businessDate === closingBusinessDate && exception.status === "open",
  ).length;
  const netSalesTotal = shiftRows.reduce((sum, row) => sum + row.netSales, 0);
  const shiftCountedTotal = useMemo(
    () => shiftRows.reduce((sum, row) => sum + (row.cashCounted ?? 0), 0),
    [shiftRows],
  );
  const expectedDrawerTotal = shiftRows.length > 0
    ? shiftRows.reduce((sum, row) => sum + row.expectedDrawerCash, 0)
    : data.summary.expectedDrawerCash;
  const cashSalesTotal = shiftRows.length > 0
    ? shiftRows.reduce((sum, row) => sum + row.cashExpected, 0)
    : data.summary.cashExpected;
  const missingCashCount = shiftRows.filter((row) => !hasCashCount(row)).length;
  const reviewShiftCount = shiftRows.filter((row) => (
    row.status === "needs_review" ||
    row.status === "reopened" ||
    ((row.cashDifference ?? 0) !== 0 && hasCashCount(row))
  )).length;
  const allShiftsCounted = shiftRows.length > 0 && missingCashCount === 0;
  const cashDifference = allShiftsCounted
    ? shiftCountedTotal - expectedDrawerTotal
    : null;
  const readyToApprove =
    allShiftsCounted &&
    cashDifference === 0 &&
    reviewShiftCount === 0 &&
    openExceptionCount === 0 &&
    dailyClosing?.status !== "closed";
  const isClosed = dailyClosing?.status === "closed";
  const closingStatus = dailyClosing?.status ?? (readyToApprove ? "ready_to_close" : "draft");
  const statusTone =
    closingStatus === "closed"
      ? "success"
      : closingStatus === "ready_to_close"
        ? "info"
        : closingStatus === "needs_review" || reviewShiftCount > 0 || missingCashCount > 0
          ? "warning"
          : closingStatus === "reopened"
            ? "danger"
            : "neutral";
  const conclusion = (() => {
    if (shiftRows.length === 0) return "Belum ada closing shift dari staff untuk periode ini.";
    if (missingCashCount > 0) return `${missingCashCount} shift belum submit cash count. Tunggu staff selesai end shift.`;
    if (reviewShiftCount > 0) return `${reviewShiftCount} shift perlu dicek ulang oleh manager sebelum owner approve.`;
    if (openExceptionCount > 0) return `${openExceptionCount} exception masih terbuka dan perlu diselesaikan.`;
    if (cashDifference !== 0) return "Total cash tidak sesuai dengan expected drawer. Minta manager review sebelum approve.";
    if (isClosed) return `Closing sudah approved${dailyClosing?.approvedAt ? ` pada ${formatDateTime(dailyClosing.approvedAt)}` : ""}.`;
    return "Semua shift sudah sesuai. Owner bisa approve closing hari ini.";
  })();

  const columns: Array<StandardTableColumn<ShiftClosingRow>> = [
    {
      key: "shiftName",
      header: "Shift",
      render: (row) => (
        <div>
          <p className="font-semibold text-gray-900">{row.shiftName}</p>
          <p className="mt-1 text-xs font-semibold text-gray-500">{row.businessDate}</p>
        </div>
      ),
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
      key: "nonCashSales",
      header: "Non-cash",
      render: (row) => formatCurrency(row.nonCashSales),
      sortValue: (row) => row.nonCashSales,
    },
    {
      key: "openingCash",
      header: "Opening Cash",
      render: (row) => formatCurrency(row.openingCash),
      sortValue: (row) => row.openingCash,
    },
    {
      key: "expectedDrawerCash",
      header: "Expected Cash",
      render: (row) => <span className="font-semibold text-gray-900">{formatCurrency(row.expectedDrawerCash)}</span>,
      sortValue: (row) => row.expectedDrawerCash,
    },
    {
      key: "cashCounted",
      header: "Counted Cash",
      render: (row) => hasCashCount(row) ? formatCurrency(row.cashCounted ?? 0) : "Waiting staff",
      sortValue: (row) => row.cashCounted ?? 0,
    },
    {
      key: "cashDifference",
      header: "Difference",
      render: (row) => {
        if (!hasCashCount(row)) return "-";
        const difference = getCashDifference(row);
        const color = difference === 0 ? "text-[#008A3D]" : "text-[#C81E1E]";
        return <span className={`font-bold ${color}`}>{formatCurrency(difference)}</span>;
      },
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

        return <SemanticBadge tone={tone}>{formatLabel(row.status)}</SemanticBadge>;
      },
    },
    {
      key: "actions",
      header: "Actions",
      isAction: true,
      render: (row) => {
        if (!needsManagerReview(row) || isClosed) {
          return <span className="text-xs font-semibold text-gray-400">No action</span>;
        }

        return (
          <button
            type="button"
            onClick={() => {
              setReviewNote("");
              setReviewModalRow(row);
            }}
            disabled={!onRequestShiftReview || reviewingShiftId === row.id}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {reviewingShiftId === row.id ? "Sending..." : "Request Review"}
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Net Sales" value={formatCurrency(netSalesTotal)} description="Total sales after discounts." tone="success" />
        <MetricCard label="Cash Sales" value={formatCurrency(cashSalesTotal)} description="Cash payment from orders." tone="waiting" />
        <MetricCard label="Expected Cash" value={formatCurrency(expectedDrawerTotal)} description="Opening cash plus cash sales." tone="progress" />
        <MetricCard
          label="Counted Cash"
          value={allShiftsCounted ? formatCurrency(shiftCountedTotal) : `${shiftRows.length - missingCashCount}/${shiftRows.length} shift`}
          description="Submitted by staff at end shift."
          tone={allShiftsCounted ? "success" : "waiting"}
        />
        <MetricCard
          label="Cash Difference"
          value={cashDifference === null ? "-" : formatCurrency(cashDifference)}
          description={cashDifference === 0 ? "Cash matches expected." : "Needs manager review."}
          tone={cashDifference === null ? "neutral" : cashDifference === 0 ? "success" : "danger"}
        />
      </div>

      <StandardPanel
        title="Daily Closing"
        description="Owner checkpoint dari closing shift staff. Owner cukup approve jika kas sesuai, atau minta manager review jika ada selisih."
        action={
          <div className="flex flex-wrap gap-2">
            {isClosed ? (
              <button
                type="button"
                onClick={() => onReopenDaily?.(dailyClosing.businessDate, ownerNote)}
                disabled={!onReopenDaily || reopeningDaily}
                className="rounded-xl border border-[#F7B8C3] bg-white px-4 py-3 text-sm font-bold text-[#BE123C] shadow-sm transition hover:bg-[#FFF1F2] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {reopeningDaily ? "Reopening..." : "Reopen Closing"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onApproveDaily?.(ownerNote)}
                disabled={!onApproveDaily || closingDaily || !readyToApprove}
                className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
              >
                {closingDaily ? "Approving..." : "Approve Closing"}
              </button>
            )}
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0">
            <StandardTable
              columns={columns}
              data={shiftRows}
              getRowKey={(row) => row.id}
              emptyLabel="No shift closing submitted yet."
              minWidthClassName="min-w-[1120px]"
            />
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-gray-500">Closing Status</p>
                <SemanticBadge tone={statusTone}>{formatLabel(closingStatus)}</SemanticBadge>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-600">{conclusion}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-bold text-gray-500">Review Checklist</p>
              <div className="mt-3 space-y-2 text-sm font-semibold text-gray-700">
                <p>{shiftRows.length > 0 ? "Pass" : "Waiting"} - Shift rows available</p>
                <p>{allShiftsCounted ? "Pass" : "Waiting"} - Staff cash count submitted</p>
                <p>{cashDifference === 0 ? "Pass" : "Needs review"} - Cash matches expected</p>
                <p>{reviewShiftCount === 0 ? "Pass" : "Needs review"} - No shift review item</p>
                <p>{openExceptionCount === 0 ? "Pass" : "Needs review"} - No open exception</p>
              </div>
            </div>
            <label className="block text-sm font-semibold text-gray-700">
              Owner Note
              <textarea
                value={ownerNote}
                onChange={(event) => setOwnerNote(event.target.value)}
                placeholder="Optional note for approval or reopen reason"
                rows={4}
                className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
              />
            </label>
          </div>
        </div>
      </StandardPanel>

      {reviewModalRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-950">Request Manager Review</h3>
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

            <div className="mt-5 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm md:grid-cols-3">
              <div>
                <p className="font-semibold text-gray-500">Expected</p>
                <p className="mt-1 font-bold text-gray-950">{formatCurrency(reviewModalRow.expectedDrawerCash)}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-500">Counted</p>
                <p className="mt-1 font-bold text-gray-950">
                  {hasCashCount(reviewModalRow) ? formatCurrency(reviewModalRow.cashCounted ?? 0) : "-"}
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-500">Difference</p>
                <p className="mt-1 font-bold text-gray-950">
                  {hasCashCount(reviewModalRow)
                    ? formatCurrency(reviewModalRow.cashDifference ?? ((reviewModalRow.cashCounted ?? 0) - reviewModalRow.expectedDrawerCash))
                    : "-"}
                </p>
              </div>
            </div>

            <label className="mt-5 block text-sm font-semibold text-gray-700">
              Review Note
              <textarea
                value={reviewNote}
                onChange={(event) => setReviewNote(event.target.value)}
                placeholder="Tell manager what needs to be checked"
                rows={4}
                className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
                autoFocus
              />
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReviewModalRow(null)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition hover:border-gray-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onRequestShiftReview?.(reviewModalRow, reviewNote);
                  setReviewModalRow(null);
                }}
                disabled={!onRequestShiftReview || reviewingShiftId === reviewModalRow.id}
                className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
              >
                {reviewingShiftId === reviewModalRow.id ? "Sending..." : "Send Review Request"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
