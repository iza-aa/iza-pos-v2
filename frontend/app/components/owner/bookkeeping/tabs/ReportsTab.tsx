"use client";

import { useState } from "react";
import StandardTable, { type StandardTableColumn } from "@/app/components/shared/StandardTable";
import type { BookkeepingDashboardData, BookkeepingReport } from "@/lib/services/bookkeeping/bookkeepingTypes";
import { getCurrentUser } from "@/lib/utils";
import { SemanticBadge, StandardPanel, formatCurrency, formatDateTime, formatLabel } from "../BookkeepingPrimitives";

type ReportSnapshot = Partial<BookkeepingDashboardData> & {
  generatedByName?: string;
  generatedAt?: string;
};

const asReportSnapshot = (value: unknown): ReportSnapshot => {
  if (!value || typeof value !== "object") return {};
  return value as ReportSnapshot;
};

export default function ReportsTab({
  data,
  generating = false,
  onGenerate,
}: {
  data: BookkeepingDashboardData;
  generating?: boolean;
  onGenerate?: () => void;
}) {
  const [selectedReport, setSelectedReport] = useState<BookkeepingReport | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportError, setExportError] = useState("");

  const downloadCsv = (filename: string, rows: string[][]) => {
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadBlob = (filename: string, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportHistoryCsv = () => {
    const rows = [
      ["Report Name", "Type", "Period", "Generated At", "Status"],
      ...data.reports.map((report) => [
        report.name,
        report.type,
        report.period,
        formatDateTime(report.generatedAt),
        formatLabel(report.status),
      ]),
    ];

    downloadCsv("bookkeeping-report-history.csv", rows);
  };

  const exportSnapshotCsv = () => {
    downloadCsv("bookkeeping-current-snapshot.csv", [
      ["Section", "Metric", "Value"],
      ["Summary", "Gross Sales", String(data.summary.grossSales)],
      ["Summary", "Net Sales", String(data.summary.netSales)],
      ["Summary", "Estimated COGS", String(data.summary.estimatedCogs ?? "")],
      ["Summary", "Gross Profit", String(data.summary.grossProfit ?? "")],
      ["Summary", "Operating Expenses", String(data.summary.operatingExpenses)],
      ["Summary", "Net Profit Estimate", String(data.summary.netProfitEstimate ?? "")],
      ["Summary", "Cash Sales", String(data.summary.cashExpected)],
      ["Summary", "Expected Drawer", String(data.summary.expectedDrawerCash)],
      ["Summary", "Cash To Deposit", String(data.summary.cashToDeposit)],
      ["Summary", "Open Exceptions", String(data.summary.unresolvedExceptions)],
      ["Payment", "Method", "Orders", "Amount"],
      ...data.paymentBreakdown.map((row) => ["Payment", row.method, String(row.orders), String(row.amount)]),
      ["Ledger", "Date", "Type", "Source", "Direction", "Amount", "Status"],
      ...data.entries.map((row) => [
        "Ledger",
        row.businessDate,
        formatLabel(row.type),
        row.source,
        formatLabel(row.direction),
        String(row.amount),
        formatLabel(row.status),
      ]),
      ["Shift Closing", "Date", "Shift", "Net Sales", "Cash Sales", "Opening Cash", "Expected Drawer", "Cash Counted", "Cash Difference", "Status"],
      ...data.shiftClosings.map((row) => [
        "Shift Closing",
        row.businessDate,
        row.shiftName,
        String(row.netSales),
        String(row.cashExpected),
        String(row.openingCash),
        String(row.expectedDrawerCash),
        String(row.cashCounted ?? ""),
        String(row.cashDifference ?? ""),
        formatLabel(row.status),
      ]),
      ["Daily Closing", "Date", "Net Sales", "Cash Sales", "Expected Drawer", "Cash Counted", "Cash Difference", "Status"],
      data.dailyClosing
        ? [
            "Daily Closing",
            data.dailyClosing.businessDate,
            String(data.dailyClosing.netSales),
            String(data.dailyClosing.cashExpected),
            String(data.dailyClosing.expectedDrawerCash),
            String(data.dailyClosing.cashCounted ?? ""),
            String(data.dailyClosing.cashDifference ?? ""),
            formatLabel(data.dailyClosing.status),
          ]
        : ["Daily Closing", data.dateRange.endDate, "", "", "", "", "", "Not Closed"],
      ["Menu Margin", "Menu", "Sold", "Revenue", "Estimated COGS", "Gross Profit", "Margin", "Status"],
      ...data.menuMargins.map((row) => [
        "Menu Margin",
        row.menuName,
        String(row.quantitySold),
        String(row.revenue),
        String(row.estimatedCogs ?? ""),
        String(row.grossProfit ?? ""),
        String(row.marginPct ?? ""),
        formatLabel(row.status),
      ]),
      ["Expense", "Date", "Category", "Amount", "Payment Method", "Vendor", "Note"],
      ...data.expenses.map((row) => [
        "Expense",
        row.expenseDate,
        row.category,
        String(row.amount),
        row.paymentMethod || "",
        row.vendor || "",
        row.note || "",
      ]),
      ["Exception", "Date", "Severity", "Type", "Description", "Status"],
      ...data.exceptions.map((row) => [
        "Exception",
        row.businessDate,
        formatLabel(row.severity),
        row.type,
        row.description,
        formatLabel(row.status),
      ]),
    ]);
  };

  const exportSnapshotExcel = async () => {
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    const summaryRows = [
      ["Metric", "Value"],
      ["Gross Sales", data.summary.grossSales],
      ["Net Sales", data.summary.netSales],
      ["Estimated COGS", data.summary.estimatedCogs ?? ""],
      ["Gross Profit", data.summary.grossProfit ?? ""],
      ["Operating Expenses", data.summary.operatingExpenses],
      ["Net Profit Estimate", data.summary.netProfitEstimate ?? ""],
      ["Cash Sales", data.summary.cashExpected],
      ["Expected Drawer", data.summary.expectedDrawerCash],
      ["Cash To Deposit", data.summary.cashToDeposit],
      ["Open Exceptions", data.summary.unresolvedExceptions],
    ];
    const ledgerRows = [
      ["Date", "Type", "Source", "Direction", "Amount", "Status"],
      ...data.entries.map((row) => [
        row.businessDate,
        formatLabel(row.type),
        row.source,
        formatLabel(row.direction),
        row.amount,
        formatLabel(row.status),
      ]),
    ];
    const marginRows = [
      ["Menu", "Sold", "Revenue", "Estimated COGS", "Gross Profit", "Margin", "Status"],
      ...data.menuMargins.map((row) => [
        row.menuName,
        row.quantitySold,
        row.revenue,
        row.estimatedCogs ?? "",
        row.grossProfit ?? "",
        row.marginPct ?? "",
        formatLabel(row.status),
      ]),
    ];
    const expenseRows = [
      ["Date", "Category", "Amount", "Payment Method", "Vendor", "Receipt", "Note"],
      ...data.expenses.map((row) => [
        row.expenseDate,
        row.category,
        row.amount,
        row.paymentMethod || "",
        row.vendor || "",
        row.receiptUrl || "",
        row.note || "",
      ]),
    ];
    const closingRows = [
      ["Date", "Shift", "Net Sales", "Cash Sales", "Opening Cash", "Expected Drawer", "Cash Counted", "Cash Difference", "Status"],
      ...data.shiftClosings.map((row) => [
        row.businessDate,
        row.shiftName,
        row.netSales,
        row.cashExpected,
        row.openingCash,
        row.expectedDrawerCash,
        row.cashCounted ?? "",
        row.cashDifference ?? "",
        formatLabel(row.status),
      ]),
    ];

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summaryRows), "Summary");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(ledgerRows), "Ledger");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(marginRows), "Cost Margin");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(expenseRows), "Expenses");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(closingRows), "Closings");

    const output = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    downloadBlob(
      "bookkeeping-current-snapshot.xlsx",
      new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    );
  };

  const exportServerPdf = async () => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "owner") {
      setExportError("Owner access required.");
      return;
    }

    setExportingPdf(true);
    setExportError("");

    try {
      const response = await fetch("/api/owner/bookkeeping/reports/export/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
          "x-user-name": currentUser.name,
          "x-user-role": currentUser.role,
        },
        body: JSON.stringify({ dateRange: data.dateRange }),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(result.error || "PDF could not be exported.");
      }

      downloadBlob(
        `bookkeeping-${data.dateRange.startDate}-to-${data.dateRange.endDate}.pdf`,
        await response.blob(),
      );
    } catch (error) {
      console.error("Failed to export bookkeeping PDF:", error);
      setExportError(error instanceof Error ? error.message : "PDF could not be exported.");
    } finally {
      setExportingPdf(false);
    }
  };

  const columns: Array<StandardTableColumn<BookkeepingReport>> = [
    {
      key: "name",
      header: "Report Name",
      render: (row) => <span className="font-semibold text-gray-900">{row.name}</span>,
    },
    {
      key: "type",
      header: "Type",
      render: (row) => row.type,
    },
    {
      key: "period",
      header: "Period",
      render: (row) => row.period,
    },
    {
      key: "generatedAt",
      header: "Generated At",
      render: (row) => formatDateTime(row.generatedAt),
      sortValue: (row) => row.generatedAt,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <SemanticBadge tone="success">{formatLabel(row.status)}</SemanticBadge>,
    },
    {
      key: "actions",
      header: "Actions",
      isAction: true,
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedReport(row)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-gray-900"
        >
          View Detail
        </button>
      ),
    },
  ];

  const selectedSnapshot = asReportSnapshot(selectedReport?.snapshotJson);
  const detailSummary = selectedSnapshot.summary ?? data.summary;
  const detailPaymentBreakdown = selectedSnapshot.paymentBreakdown ?? data.paymentBreakdown;
  const detailEntries = selectedSnapshot.entries ?? data.entries;
  const detailExpenses = selectedSnapshot.expenses ?? data.expenses;
  const detailShiftClosings = selectedSnapshot.shiftClosings ?? data.shiftClosings;
  const detailExceptions = selectedSnapshot.exceptions ?? data.exceptions;
  const detailMenuMargins = selectedSnapshot.menuMargins ?? data.menuMargins;

  return (
    <div className="space-y-4">
      <StandardPanel
        title="Report History"
        description="Generated bookkeeping report snapshots for owner review and future export."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportHistoryCsv}
              disabled={data.reports.length === 0}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm transition hover:border-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={exportSnapshotCsv}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm transition hover:border-gray-900"
            >
              Export Snapshot
            </button>
            <button
              type="button"
              onClick={() => void exportSnapshotExcel()}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm transition hover:border-gray-900"
            >
              Export Excel
            </button>
            <button
              type="button"
              onClick={() => void exportServerPdf()}
              disabled={exportingPdf}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm transition hover:border-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exportingPdf ? "Exporting PDF..." : "Export PDF"}
            </button>
            <button
              type="button"
              onClick={onGenerate}
              disabled={!onGenerate || generating}
              className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
            >
              {generating ? "Generating Report..." : "Generate Report"}
            </button>
          </div>
        }
      >
        {exportError ? (
          <div className="mb-4 rounded-xl border border-[#F6C99F] bg-[#FFF1E6] p-3 text-sm font-semibold text-[#B45309]">
            {exportError}
          </div>
        ) : null}
        <StandardTable
          columns={columns}
          data={data.reports}
          getRowKey={(row) => row.id}
          emptyLabel="No generated reports yet."
          minWidthClassName="min-w-[860px]"
        />
      </StandardPanel>

      {selectedReport ? (
        <StandardPanel
          title="Report Detail"
          description={`${selectedReport.name} generated ${formatDateTime(selectedReport.generatedAt)}.`}
          action={
            <button
              type="button"
              onClick={() => setSelectedReport(null)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm transition hover:border-gray-900"
            >
              Close Detail
            </button>
          }
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-bold text-gray-500">Type</p>
              <p className="mt-2 text-lg font-bold text-gray-950">{formatLabel(selectedReport.type)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-bold text-gray-500">Period</p>
              <p className="mt-2 text-lg font-bold text-gray-950">{selectedReport.period}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-bold text-gray-500">Status</p>
              <p className="mt-2 text-lg font-bold text-gray-950">{formatLabel(selectedReport.status)}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-bold text-gray-500">Net Sales</p>
              <p className="mt-2 text-lg font-bold text-gray-950">{formatCurrency(detailSummary.netSales)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-bold text-gray-500">Estimated COGS</p>
              <p className="mt-2 text-lg font-bold text-gray-950">{formatCurrency(detailSummary.estimatedCogs)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-bold text-gray-500">Operating Expenses</p>
              <p className="mt-2 text-lg font-bold text-gray-950">{formatCurrency(detailSummary.operatingExpenses)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-bold text-gray-500">Open Exceptions</p>
              <p className="mt-2 text-lg font-bold text-gray-950">{detailSummary.unresolvedExceptions}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-base font-bold text-gray-950">Payment Breakdown</h3>
              <div className="mt-3 space-y-2">
                {detailPaymentBreakdown.length > 0 ? detailPaymentBreakdown.map((row) => (
                  <div key={row.method} className="flex items-center justify-between border-b border-gray-100 py-2 text-sm">
                    <span className="font-semibold text-gray-700">{row.method} ({row.orders} order)</span>
                    <span className="font-bold text-gray-950">{formatCurrency(row.amount)}</span>
                  </div>
                )) : <p className="text-sm text-gray-500">No payment rows.</p>}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-base font-bold text-gray-950">Closing Snapshot</h3>
              <div className="mt-3 space-y-2 text-sm text-gray-600">
                <p><span className="font-semibold text-gray-900">Shift rows:</span> {detailShiftClosings.length}</p>
                <p><span className="font-semibold text-gray-900">Ledger rows:</span> {detailEntries.length}</p>
                <p><span className="font-semibold text-gray-900">Expense rows:</span> {detailExpenses.length}</p>
                <p><span className="font-semibold text-gray-900">Exception rows:</span> {detailExceptions.length}</p>
                <p><span className="font-semibold text-gray-900">Menu margin rows:</span> {detailMenuMargins.length}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-base font-bold text-gray-950">What This Report Means</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              This report freezes the selected period into a bookkeeping snapshot: sales, payment split,
              estimated food cost, operating expenses, closing rows, and unresolved review items.
              Use exports when the owner needs a file for accounting or audit history.
            </p>
          </div>
        </StandardPanel>
      ) : null}
    </div>
  );
}
