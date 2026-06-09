"use client";

import { useMemo } from "react";
import { ExportButton } from "@/app/components/shared";
import { useLanguage } from "@/app/components/shared/i18n";
import StandardTable, { type StandardTableColumn } from "@/app/components/shared/StandardTable";
import { showError, showSuccess } from "@/lib/services/errorHandling";
import type {
  BookkeepingDashboardData,
  ShiftClosingRow,
} from "@/lib/services/bookkeeping/bookkeepingTypes";
import { downloadXlsxWorkbook } from "@/lib/utils/exportExcel";
import {
  MetricCard,
  SemanticBadge,
  StandardPanel,
  formatCurrency,
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

const getShiftStatusLabelKey = (row: ShiftClosingRow) => {
  if (!hasCashCount(row)) return "owner.bookkeeping.waitingCount";
  if (row.status === "closed") return "owner.bookkeeping.managerApproved";
  if (needsManagerReview(row)) return "owner.bookkeeping.needsReview";
  return "owner.bookkeeping.needsApproval";
};

export default function ClosingsTab({
  data,
  loading = false,
  closingDaily = false,
  reopeningDaily = false,
  onApproveDaily,
  onReopenDaily,
}: {
  data: BookkeepingDashboardData;
  loading?: boolean;
  closingDaily?: boolean;
  reopeningDaily?: boolean;
  onApproveDaily?: (notes: string) => void;
  onReopenDaily?: (businessDate: string, reason: string) => void;
}) {
  const { t } = useLanguage();
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
  const allShiftsManagerApproved = shiftRows.length > 0 && shiftRows.every((row) => row.status === "closed");
  const cashDifference = allShiftsCounted
    ? shiftCountedTotal - expectedDrawerTotal
    : null;
  const readyToApprove =
    allShiftsCounted &&
    allShiftsManagerApproved &&
    cashDifference === 0 &&
    reviewShiftCount === 0 &&
    openExceptionCount === 0 &&
    dailyClosing?.status !== "closed";
  const isClosed = dailyClosing?.status === "closed";
  const exportDailyClosingWorkbook = async () => {
    try {
      const entries = data.entries.filter((entry) => entry.businessDate === closingBusinessDate);
      const expenses = data.expenses.filter((expense) => expense.expenseDate === closingBusinessDate);
      const exceptions = data.exceptions.filter((exception) => exception.businessDate === closingBusinessDate);
      const filename = `daily-shift-closing-${closingBusinessDate}.xlsx`;

      await downloadXlsxWorkbook(filename, [
        {
          name: "Daily Summary",
          rows: [
            ["Business Date", closingBusinessDate],
            ["Daily Status", dailyClosing?.status ?? "draft"],
            ["Gross Sales", dailyClosing?.grossSales ?? data.summary.grossSales],
            ["Discount Total", dailyClosing?.discountTotal ?? data.summary.discounts],
            ["Net Sales", dailyClosing?.netSales ?? netSalesTotal],
            ["Tax Collected", data.summary.taxCollected],
            ["Estimated COGS", dailyClosing?.cogsEstimate ?? data.summary.estimatedCogs ?? 0],
            ["Expense Total", dailyClosing?.expenseTotal ?? data.summary.operatingExpenses],
            ["Gross Profit Estimate", dailyClosing?.grossProfitEstimate ?? data.summary.grossProfit ?? 0],
            ["Net Profit Estimate", dailyClosing?.netProfitEstimate ?? data.summary.netProfitEstimate ?? 0],
            ["Opening Cash Total", dailyClosing?.openingCashTotal ?? data.summary.openingCashTotal],
            ["Cash Sales", dailyClosing?.cashExpected ?? cashSalesTotal],
            ["Expected Drawer Cash", dailyClosing?.expectedDrawerCash ?? expectedDrawerTotal],
            ["Counted Cash", dailyClosing?.cashCounted ?? (allShiftsCounted ? shiftCountedTotal : "")],
            ["Cash Difference", dailyClosing?.cashDifference ?? cashDifference ?? ""],
            ["Cash To Deposit", dailyClosing?.cashToDeposit ?? data.summary.cashToDeposit],
            ["Closing Float Total", dailyClosing?.closingFloatTotal ?? data.summary.closingFloatTotal],
            ["Total Orders", data.summary.totalOrders],
            ["Cancelled Orders", data.summary.cancelledOrders],
            ["Unresolved Exceptions", dailyClosing?.unresolvedExceptionCount ?? openExceptionCount],
            ["Approved At", dailyClosing?.approvedAt ?? ""],
            ["Notes", dailyClosing?.notes ?? ""],
          ],
        },
        {
          name: "Shift Closings",
          rows: [
            [
              "Shift",
              "Business Date",
              "Gross Sales",
              "Discount",
              "Net Sales",
              "Cash Sales",
              "Non-cash Sales",
              "Opening Cash",
              "Expected Cash",
              "Counted Cash",
              "Difference",
              "Cash To Deposit",
              "Closing Float",
              "Float Policy",
              "Cancelled Orders",
              "Status",
              "Opened At",
              "Closed At",
            ],
            ...shiftRows.map((row) => [
              row.shiftName,
              row.businessDate,
              row.grossSales,
              row.discountTotal,
              row.netSales,
              row.cashExpected,
              row.nonCashSales,
              row.openingCash,
              row.expectedDrawerCash,
              row.cashCounted ?? "",
              hasCashCount(row) ? getCashDifference(row) : "",
              row.cashToDeposit,
              row.closingFloat,
              row.floatPolicy,
              row.cancelledCount,
              t(getShiftStatusLabelKey(row)),
              row.openedAt ?? "",
              row.closedAt ?? "",
            ]),
          ],
        },
        {
          name: "Payment Breakdown",
          rows: [
            ["Payment Method", "Orders", "Amount"],
            ...data.paymentBreakdown.map((payment) => [payment.method, payment.orders, payment.amount]),
          ],
        },
        {
          name: "Ledger Entries",
          rows: [
            ["Entry At", "Business Date", "Type", "Category", "Source", "Payment Method", "Direction", "Amount", "Status", "Note"],
            ...entries.map((entry) => [
              entry.entryAt,
              entry.businessDate,
              entry.type,
              entry.category,
              entry.source,
              entry.paymentMethod ?? "",
              entry.direction,
              entry.amount,
              entry.status,
              entry.note ?? "",
            ]),
          ],
        },
        {
          name: "Expenses",
          rows: [
            ["Date", "Category", "Amount", "Payment Method", "Vendor", "Receipt", "Note"],
            ...expenses.map((expense) => [
              expense.expenseDate,
              expense.category,
              expense.amount,
              expense.paymentMethod ?? "",
              expense.vendor ?? "",
              expense.receiptUrl ?? "",
              expense.note ?? "",
            ]),
          ],
        },
        {
          name: "Exceptions",
          rows: [
            ["Date", "Severity", "Type", "Description", "Source", "Suggested Fix", "Status", "Manager Review"],
            ...exceptions.map((exception) => [
              exception.businessDate,
              exception.severity,
              exception.type,
              exception.description,
              exception.source,
              exception.suggestedFix,
              exception.status,
              exception.reviewStatus ?? "",
            ]),
          ],
        },
      ]);

      showSuccess(t("owner.bookkeeping.dailyWorkbookExported"));
    } catch (error) {
      console.error("Failed to export daily closing workbook:", error);
      showError(t("owner.bookkeeping.dailyWorkbookExportError"));
    }
  };
  const columns: Array<StandardTableColumn<ShiftClosingRow>> = [
    {
      key: "shiftName",
      header: t("owner.bookkeeping.shift"),
      render: (row) => (
        <div>
          <p className="font-semibold text-gray-900">{row.shiftName}</p>
          <p className="mt-1 text-xs font-semibold text-gray-500">{row.businessDate}</p>
        </div>
      ),
    },
    {
      key: "netSales",
      header: t("owner.bookkeeping.netSales"),
      render: (row) => <span className="font-semibold text-gray-900">{formatCurrency(row.netSales)}</span>,
      sortValue: (row) => row.netSales,
    },
    {
      key: "cashExpected",
      header: t("owner.bookkeeping.cashSales"),
      render: (row) => formatCurrency(row.cashExpected),
      sortValue: (row) => row.cashExpected,
    },
    {
      key: "nonCashSales",
      header: t("owner.bookkeeping.nonCash"),
      render: (row) => formatCurrency(row.nonCashSales),
      sortValue: (row) => row.nonCashSales,
    },
    {
      key: "openingCash",
      header: t("owner.bookkeeping.openingCash"),
      render: (row) => formatCurrency(row.openingCash),
      sortValue: (row) => row.openingCash,
    },
    {
      key: "expectedDrawerCash",
      header: t("owner.bookkeeping.expectedCash"),
      render: (row) => <span className="font-semibold text-gray-900">{formatCurrency(row.expectedDrawerCash)}</span>,
      sortValue: (row) => row.expectedDrawerCash,
    },
    {
      key: "cashCounted",
      header: t("owner.bookkeeping.countedCash"),
      render: (row) => hasCashCount(row) ? formatCurrency(row.cashCounted ?? 0) : t("owner.bookkeeping.waitingStaff"),
      sortValue: (row) => row.cashCounted ?? 0,
    },
    {
      key: "cashDifference",
      header: t("owner.bookkeeping.difference"),
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
      header: t("owner.bookkeeping.status"),
      render: (row) => {
        const label = t(getShiftStatusLabelKey(row));
        const tone = !hasCashCount(row)
          ? "warning"
          : row.status === "closed"
            ? "success"
            : "warning";

        return <SemanticBadge tone={tone}>{label}</SemanticBadge>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label={t("owner.bookkeeping.netSales")} value={formatCurrency(netSalesTotal)} description={t("owner.bookkeeping.afterDiscounts")} tone="success" />
        <MetricCard label={t("owner.bookkeeping.cashSales")} value={formatCurrency(cashSalesTotal)} description={t("owner.bookkeeping.cashPaymentOrders")} tone="waiting" />
        <MetricCard label={t("owner.bookkeeping.expectedCash")} value={formatCurrency(expectedDrawerTotal)} description={t("owner.bookkeeping.openingPlusCashSales")} tone="progress" />
        <MetricCard
          label={t("owner.bookkeeping.countedCash")}
          value={allShiftsCounted ? formatCurrency(shiftCountedTotal) : `${shiftRows.length - missingCashCount}/${shiftRows.length} shift`}
          description={t("owner.bookkeeping.submittedByStaff")}
          tone={allShiftsCounted ? "success" : "waiting"}
        />
        <MetricCard
          label={t("owner.bookkeeping.cashDifference")}
          value={cashDifference === null ? "-" : formatCurrency(cashDifference)}
          description={cashDifference === 0 ? t("owner.bookkeeping.cashMatches") : t("owner.bookkeeping.needsManagerReview")}
          tone={cashDifference === null ? "neutral" : cashDifference === 0 ? "success" : "danger"}
        />
      </div>

      <StandardPanel
        title={t("owner.bookkeeping.dailyShiftClosing")}
        description={t("owner.bookkeeping.dailyShiftClosingDescription")}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <ExportButton
              label={t("owner.bookkeeping.exportDaily")}
              disabled={loading}
              items={[
                {
                  id: "daily-shift-closing",
                  label: t("owner.bookkeeping.dailyWorkbook"),
                  onClick: () => void exportDailyClosingWorkbook(),
                  disabled: loading,
                },
              ]}
            />
            {isClosed ? (
              <button
                type="button"
                onClick={() => onReopenDaily?.(closingBusinessDate, "Owner reopened daily report.")}
                disabled={!onReopenDaily || reopeningDaily}
                className="rounded-xl border border-[#F7B8C3] bg-white px-4 py-3 text-sm font-bold text-[#BE123C] shadow-sm transition hover:bg-[#FFF1F2] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {reopeningDaily ? t("owner.bookkeeping.reopening") : t("owner.bookkeeping.reopenDaily")}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onApproveDaily?.("")}
                disabled={!onApproveDaily || closingDaily || !readyToApprove}
                className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
              >
                {closingDaily ? t("owner.bookkeeping.approving") : t("owner.bookkeeping.approveDaily")}
              </button>
            )}
          </div>
        }
      >
        <StandardTable
          columns={columns}
          data={shiftRows}
          getRowKey={(row) => row.id}
          loading={loading}
          emptyLabel={t("owner.bookkeeping.noShiftClosing")}
          minWidthClassName="min-w-[980px]"
        />
      </StandardPanel>
    </div>
  );
}
