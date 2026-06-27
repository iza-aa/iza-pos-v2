"use client";

import { useMemo, useState } from "react";
import { EyeIcon } from "@heroicons/react/24/outline";
import { ExportButton, StandardModal } from "@/app/components/shared";
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
}: {
  data: BookkeepingDashboardData;
  loading?: boolean;
}) {
  const { t } = useLanguage();
  const [selectedClosingForEnv, setSelectedClosingForEnv] = useState<ShiftClosingRow | null>(null);
  const dailyClosing = data.dailyClosing;
  const closingBusinessDate = data.dateRange.endDate;
  const shiftRows = data.shiftClosings.filter((row) => row.businessDate === closingBusinessDate);
  const openExceptionCount = dailyClosing?.unresolvedExceptionCount ?? data.exceptions.filter(
    (exception) => exception.businessDate === closingBusinessDate && exception.status === "open",
  ).length;
  const netSalesTotal = shiftRows.reduce((sum, row) => sum + row.netSales, 0);
  const shiftCountedTotal = useMemo(
    () => shiftRows.reduce((sum, row) => sum + row.cashToDeposit, 0),
    [shiftRows],
  );
  const cashSalesTotal = shiftRows.length > 0
    ? shiftRows.reduce((sum, row) => sum + row.cashExpected, 0)
    : data.summary.cashExpected;
  const totalCashIn = shiftRows.reduce((sum, row) => sum + row.cashIn, 0);
  const totalCashOut = shiftRows.reduce((sum, row) => sum + row.cashOut, 0);
  const sortedShiftRows = [...shiftRows].sort((a, b) =>
    (a.openedAt ?? `${a.businessDate}T00:00:00`).localeCompare(b.openedAt ?? `${b.businessDate}T00:00:00`)
  );
  const firstShiftOpeningCash = sortedShiftRows.length > 0 ? (sortedShiftRows[0].openingCashActual ?? sortedShiftRows[0].openingCash) : 0;
  const expectedDrawerTotal = shiftRows.length > 0
    ? firstShiftOpeningCash + cashSalesTotal + totalCashIn - totalCashOut
    : data.summary.expectedDrawerCash;
  const missingCashCount = shiftRows.filter((row) => !hasCashCount(row)).length;
  const allShiftsCounted = shiftRows.length > 0 && missingCashCount === 0;
  const cashDifference = allShiftsCounted
    ? shiftCountedTotal - expectedDrawerTotal
    : null;
  const exportDailyClosingWorkbook = async () => {
    try {
      const entries = data.entries.filter((entry) => entry.businessDate === closingBusinessDate);
      const expenses = data.expenses.filter((expense) => expense.expenseDate === closingBusinessDate);
      const exceptions = data.exceptions.filter((exception) => exception.businessDate === closingBusinessDate);
      const filename = `Daily-Closing-Report-${closingBusinessDate}.xlsx`;

      await downloadXlsxWorkbook(filename, [
        {
          name: "Daily Summary",
          description: "Overview of sales performance, profit estimate, and cash flow for the day.",
          rows: [
            ["Item", "Value"],

            ["▸ GENERAL INFORMATION", ""],
            ["Business Date", closingBusinessDate],
            ["Completed Orders", data.summary.totalOrders],
            ["Cancelled Orders", data.summary.cancelledOrders],
            ["Unresolved Issues (count)", openExceptionCount],

            ["▸ SALES", ""],
            ["Gross Sales", dailyClosing?.grossSales ?? data.summary.grossSales],
            ["Total Discounts", dailyClosing?.discountTotal ?? data.summary.discounts],
            ["Net Sales", dailyClosing?.netSales ?? netSalesTotal],
            ["Tax Collected (Cash)", data.summary.taxCollected],

            ["▸ PROFIT ESTIMATE", ""],
            ["Est. COGS (Cost of Goods Sold)", dailyClosing?.cogsEstimate ?? data.summary.estimatedCogs ?? 0],
            ["Total Operating Expenses", dailyClosing?.expenseTotal ?? data.summary.operatingExpenses],
            ["Est. Gross Profit", dailyClosing?.grossProfitEstimate ?? data.summary.grossProfit ?? 0],
            ["Est. Net Profit", dailyClosing?.netProfitEstimate ?? data.summary.netProfitEstimate ?? 0],

            ["▸ CASH FLOW & DEPOSIT", ""],
            ["Opening Cash (All Shifts)", dailyClosing?.openingCashTotal ?? data.summary.openingCashTotal],
            ["Cash Sales (System)", dailyClosing?.cashExpected ?? cashSalesTotal],
            ["Expected Cash in Drawer", dailyClosing?.expectedDrawerCash ?? expectedDrawerTotal],
            ["Physically Counted Cash", dailyClosing?.cashCounted ?? (allShiftsCounted ? shiftCountedTotal : "Not all shifts counted")],
            ["Cash Variance", dailyClosing?.cashDifference ?? cashDifference ?? (allShiftsCounted ? 0 : "Pending")],
            ["Cash Deposited to Owner", dailyClosing?.cashToDeposit ?? data.summary.cashToDeposit],
            ["Closing Float Retained (Cash in Drawer)", dailyClosing?.closingFloatTotal ?? data.summary.closingFloatTotal],
          ],
        },
        {
          name: "Shift Breakdown",
          description: "Closing details per shift. Float Cash is the closing float each shift left in the drawer; only the last shift's float carries over as the day's retained cash.",
          rows: [
            [
              "Shift Name",
              "Cashier",
              "Envelope No.",
              "Opening Cash",
              "Net Sales",
              "Cash Sales",
              "Cash In",
              "Cash Out",
              "Non-Cash Sales",
              "Expected Drawer Cash",
              "Counted Cash",
              "Cash Variance",
              "Cash Deposited",
              "Float Cash (Drawer)",
              "Status",
            ],
            ...shiftRows.map((row) => [
              row.shiftName,
              (row.snapshotJson?.submittedByName as string) || "-",
              (row.snapshotJson?.envelopeNumber as string) || row.deposit?.envelopeNumber || "-",
              row.openingCashActual ?? row.openingCash,
              row.netSales,
              row.cashExpected,
              row.cashIn,
              row.cashOut,
              row.nonCashSales,
              row.expectedDrawerCash,
              row.cashCounted ?? "Not counted",
              hasCashCount(row) ? getCashDifference(row) : "-",
              row.cashToDeposit,
              row.actualClosingFloat ?? row.closingFloat,
              t(getShiftStatusLabelKey(row)),
            ]),
          ],
        },
        {
          name: "Payment Methods",
          description: "Breakdown of payment methods used by customers.",
          rows: [
            ["Payment Method", "Orders", "Total Amount"],
            ...data.paymentBreakdown.map((payment) => [payment.method, payment.orders, payment.amount]),
          ],
        },
        {
          name: "Ledger Entries",
          description: "Automatic log of all financial movements recorded by the system.",
          rows: [
            ["Time", "Type", "Category", "Source", "Direction", "Amount", "Status"],
            ...entries.map((entry) => [
              new Date(entry.entryAt).toLocaleString("en-GB", { timeStyle: "short", dateStyle: "short" }),
              entry.type,
              entry.category,
              entry.source,
              entry.direction === "in" ? "In" : entry.direction === "out" ? "Out" : "Neutral",
              entry.amount,
              entry.status,
            ]),
          ],
        },
        {
          name: "Expenses",
          description: "Operational expenses recorded for the day.",
          rows: [
            ["Category", "Amount", "Payment Method", "Vendor / Store", "Note"],
            ...expenses.map((expense) => [
              expense.category,
              expense.amount,
              expense.paymentMethod ?? "-",
              expense.vendor ?? "-",
              expense.note ?? "-",
            ]),
          ],
        },
        {
          name: "Issues & Exceptions",
          description: "Anomalies or system issues detected for the day.",
          rows: [
            ["Severity", "Type", "Description", "Status", "Manager Review"],
            ...exceptions.map((exception) => [
              exception.severity.toUpperCase(),
              exception.type,
              exception.description,
              exception.status,
              exception.reviewStatus ?? "Not reviewed",
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
      headerClassName: "w-[9%]",
      render: (row) => (
        <div>
          <p className="font-semibold text-gray-900">{row.shiftName}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className="text-xs font-semibold text-gray-500">{row.businessDate}</span>
          </div>
        </div>
      ),
    },
    {
      key: "netSales",
      header: t("owner.bookkeeping.netSales"),
      headerClassName: "w-[11%]",
      render: (row) => <span className="font-semibold text-gray-900">{formatCurrency(row.netSales)}</span>,
      sortValue: (row) => row.netSales,
    },
    {
      key: "cashExpected",
      header: t("owner.bookkeeping.cashSales"),
      headerClassName: "w-[11%]",
      render: (row) => formatCurrency(row.cashExpected),
      sortValue: (row) => row.cashExpected,
    },
    {
      key: "cashIn",
      header: t("owner.bookkeeping.cashIn"),
      headerClassName: "w-[9%]",
      render: (row) => <span className="text-green-700 font-semibold">{row.cashIn > 0 ? `+${formatCurrency(row.cashIn)}` : "-"}</span>,
      sortValue: (row) => row.cashIn,
    },
    {
      key: "cashOut",
      header: t("owner.bookkeeping.cashOut"),
      headerClassName: "w-[9%]",
      render: (row) => <span className="text-red-700 font-semibold">{row.cashOut > 0 ? `-${formatCurrency(row.cashOut)}` : "-"}</span>,
      sortValue: (row) => row.cashOut,
    },
    {
      key: "nonCashSales",
      header: t("owner.bookkeeping.nonCash"),
      headerClassName: "w-[10%]",
      render: (row) => formatCurrency(row.nonCashSales),
      sortValue: (row) => row.nonCashSales,
    },
    {
      key: "openingCash",
      header: t("owner.bookkeeping.openingCash"),
      headerClassName: "w-[11%]",
      render: (row) => {
        const expected = row.openingCash;
        const actual = row.openingCashActual ?? expected;
        const variance = row.openingVariance ?? 0;
        return (
          <div>
            <p className="font-semibold text-gray-900">{formatCurrency(actual)}</p>
            {variance !== 0 ? (
              <p className={`text-[10px] font-bold mt-0.5 ${variance < 0 ? "text-[#C81E1E]" : "text-[#008A3D]"}`}>
                Var: {variance > 0 ? "+" : ""}{formatCurrency(variance)}
              </p>
            ) : (
              <p className="text-[10px] text-gray-400 mt-0.5">No Var</p>
            )}
          </div>
        );
      },
      sortValue: (row) => row.openingCashActual ?? row.openingCash,
    },
    {
      key: "expectedDrawerCash",
      header: t("owner.bookkeeping.expectedCash"),
      headerClassName: "w-[11%]",
      render: (row) => <span className="font-semibold text-gray-900">{formatCurrency(row.expectedDrawerCash)}</span>,
      sortValue: (row) => row.expectedDrawerCash,
    },
    {
      key: "cashCounted",
      header: t("owner.bookkeeping.countedCash"),
      headerClassName: "w-[11%]",
      render: (row) => hasCashCount(row) ? formatCurrency(row.cashCounted ?? 0) : t("owner.bookkeeping.waitingStaff"),
      sortValue: (row) => row.cashCounted ?? 0,
    },
    {
      key: "cashDifference",
      header: t("owner.bookkeeping.difference"),
      headerClassName: "w-[10%]",
      render: (row) => {
        if (!hasCashCount(row)) return "-";
        const difference = getCashDifference(row);
        const color = difference === 0 ? "text-[#008A3D]" : "text-[#C81E1E]";
        return <span className={`font-bold ${color}`}>{formatCurrency(difference)}</span>;
      },
      sortValue: (row) => row.cashDifference ?? 0,
    },
    {
      key: "envelope",
      header: t("owner.bookkeeping.envelope"),
      headerClassName: "w-[9%]",
      render: (row) => {
        const hasEnv = !!((row.snapshotJson?.envelopeNumber as string) || row.deposit?.envelopeNumber);
        if (!hasEnv) return "-";
        return (
          <button
            type="button"
            onClick={() => setSelectedClosingForEnv(row)}
            title="View envelope details"
            className="inline-flex items-center justify-center rounded-full bg-blue-50 p-1.5 text-blue-600 border border-blue-100 hover:bg-blue-100 hover:text-blue-800 transition duration-150"
          >
            <EyeIcon className="h-3.5 w-3.5" />
          </button>
        );
      },
    },
    {
      key: "status",
      header: t("owner.bookkeeping.status"),
      headerClassName: "w-[14%]",
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

      <StandardModal
        isOpen={!!selectedClosingForEnv}
        title="Detail Verifikasi Amplop Setoran"
        maxWidthClassName="max-w-md"
        onClose={() => setSelectedClosingForEnv(null)}
      >
        {selectedClosingForEnv && (
          <div className="space-y-4 text-left text-sm text-gray-700">
            <div className="rounded-xl border border-gray-150 bg-gray-50 p-4 space-y-2.5">
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="font-bold text-gray-900">Shift</span>
                <span className="font-semibold text-gray-700">{selectedClosingForEnv.shiftName} ({selectedClosingForEnv.businessDate})</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-gray-600">Nomor Amplop:</span>
                <span className="font-extrabold text-blue-700">#{(selectedClosingForEnv.snapshotJson?.envelopeNumber as string) || selectedClosingForEnv.deposit?.envelopeNumber || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-gray-600">Kasir:</span>
                <span className="font-bold text-gray-900">{(selectedClosingForEnv.snapshotJson?.submittedByName as string) || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-gray-600">Status Amplop:</span>
                <div>
                  {selectedClosingForEnv.deposit ? (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                      selectedClosingForEnv.deposit.status === "verified"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : selectedClosingForEnv.deposit.status === "disputed"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>
                      {selectedClosingForEnv.deposit.status === "verified"
                        ? "Cocok (Verified)"
                        : selectedClosingForEnv.deposit.status === "disputed"
                        ? "Selisih (Disputed)"
                        : "Menunggu Verifikasi"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-bold text-gray-500 border border-gray-200">
                      Belum Diserahkan
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-150 p-4 space-y-2 bg-white">
              <h4 className="font-bold text-gray-950 mb-2 border-b border-gray-100 pb-1.5">Rincian Nominal Kas Setoran</h4>
              
              <div className="flex justify-between text-xs font-medium">
                <span className="text-gray-500">Ekspektasi Setoran (Sistem):</span>
                <span className="text-gray-900 font-semibold">
                  {formatCurrency(selectedClosingForEnv.deposit?.expectedAmount ?? selectedClosingForEnv.cashToDeposit)}
                </span>
              </div>

              <div className="flex justify-between text-xs font-medium">
                <span className="text-gray-500">Dilaporkan Kasir:</span>
                <span className="text-gray-900 font-semibold">
                  {formatCurrency(selectedClosingForEnv.deposit?.submittedAmount ?? selectedClosingForEnv.cashToDeposit)}
                </span>
              </div>

              {selectedClosingForEnv.deposit?.status !== "submitted" && selectedClosingForEnv.deposit?.receivedAmount !== null && (
                <>
                  <div className="flex justify-between text-xs font-bold border-t border-gray-100 pt-2 mt-1">
                    <span className="text-gray-700">Dihitung Fisik Manajer:</span>
                    <span className="text-blue-700 font-extrabold">
                      {formatCurrency(selectedClosingForEnv.deposit?.receivedAmount)}
                    </span>
                  </div>

                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-700">Selisih Verifikasi Amplop:</span>
                    {(() => {
                      const variance = (selectedClosingForEnv.deposit?.receivedAmount ?? 0) - (selectedClosingForEnv.deposit?.submittedAmount ?? 0);
                      const color = variance === 0 ? "text-[#008A3D]" : "text-[#C81E1E]";
                      return (
                        <span className={`font-extrabold ${color}`}>
                          {variance > 0 ? "+" : ""}{formatCurrency(variance)}
                        </span>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>

            {selectedClosingForEnv.deposit && selectedClosingForEnv.deposit.status !== "submitted" && (
              <div className="rounded-xl border border-gray-150 bg-gray-50 p-4 space-y-2 text-xs font-medium">
                <h4 className="font-bold text-gray-950 mb-1 border-b border-gray-200 pb-1.5">Hasil Verifikasi Manajer</h4>
                <div className="flex justify-between">
                  <span className="text-gray-500">Manajer Verifikator:</span>
                  <span className="text-gray-900 font-bold">{selectedClosingForEnv.deposit.managerName || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Waktu Verifikasi:</span>
                  <span className="text-gray-900 font-semibold">
                    {selectedClosingForEnv.deposit.verifiedAt 
                      ? new Date(selectedClosingForEnv.deposit.verifiedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
                      : "-"}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <span className="text-gray-500 block mb-1">Catatan Manajer:</span>
                  <p className="text-gray-900 font-bold bg-white p-2 rounded border border-gray-150 whitespace-pre-wrap italic">
                    {selectedClosingForEnv.deposit.managerNotes || "Tidak ada catatan."}
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedClosingForEnv(null)}
                className="rounded-lg bg-gray-900 px-5 h-10 text-xs font-bold text-white transition hover:bg-gray-800"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </StandardModal>
    </div>
  );
}
