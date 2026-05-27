"use client";

import { useState } from "react";
import StandardTable, { type StandardTableColumn } from "@/app/components/shared/StandardTable";
import type { BookkeepingDashboardData, BookkeepingReport } from "@/lib/services/bookkeeping/bookkeepingTypes";
import { SemanticBadge, StandardPanel, formatCurrency, formatDateTime, formatLabel } from "../BookkeepingPrimitives";

type ReportSnapshot = Partial<BookkeepingDashboardData> & {
  generatedByName?: string;
  generatedAt?: string;
};

type AutoTableDocument = {
  lastAutoTable?: { finalY: number };
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
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportError, setExportError] = useState("");

  const downloadBlob = (filename: string, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getReportSnapshotData = () => {
    const selectedSnapshot = asReportSnapshot(selectedReport?.snapshotJson);

    return {
      summary: selectedSnapshot.summary ?? data.summary,
      paymentBreakdown: selectedSnapshot.paymentBreakdown ?? data.paymentBreakdown,
      expenses: selectedSnapshot.expenses ?? data.expenses,
      shiftClosings: selectedSnapshot.shiftClosings ?? data.shiftClosings,
      exceptions: selectedSnapshot.exceptions ?? data.exceptions,
      menuMargins: selectedSnapshot.menuMargins ?? data.menuMargins,
      dateRange: selectedSnapshot.dateRange ?? data.dateRange,
    };
  };

  const exportReportExcel = async () => {
    if (!selectedReport) return;

    setExportingExcel(true);
    setExportError("");

    try {
      const snapshot = getReportSnapshotData();
      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();
      const summaryRows = [
        ["Metric", "Value"],
        ["Gross Sales", snapshot.summary.grossSales],
        ["Net Sales", snapshot.summary.netSales],
        ["Tax Collected", snapshot.summary.taxCollected],
        ["Food Cost", snapshot.summary.estimatedCogs ?? ""],
        ["Gross Profit", snapshot.summary.grossProfit ?? ""],
        ["Operating Expenses", snapshot.summary.operatingExpenses],
        ["Net Profit Estimate", snapshot.summary.netProfitEstimate ?? ""],
        ["Cash Sales", snapshot.summary.cashExpected],
        ["Expected Drawer", snapshot.summary.expectedDrawerCash],
        ["Cash To Deposit", snapshot.summary.cashToDeposit],
        ["Open Exceptions", snapshot.summary.unresolvedExceptions],
      ];
      const marginRows = [
        ["Menu", "Sold", "Revenue", "Food Cost", "Gross Profit", "Margin", "Status"],
        ...snapshot.menuMargins.map((row) => [
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
        ...snapshot.expenses.map((row) => [
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
        ...snapshot.shiftClosings.map((row) => [
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
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(marginRows), "Cost Margin");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(expenseRows), "Expenses");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(closingRows), "Closings");

      const output = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      downloadBlob(
        `bookkeeping-report-${snapshot.dateRange.startDate}-to-${snapshot.dateRange.endDate}.xlsx`,
        new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      );
    } catch (error) {
      console.error("Failed to export bookkeeping Excel:", error);
      setExportError(error instanceof Error ? error.message : "Excel could not be exported.");
    } finally {
      setExportingExcel(false);
    }
  };

  const exportReportPdf = async () => {
    if (!selectedReport) return;

    setExportingPdf(true);
    setExportError("");

    try {
      const snapshot = getReportSnapshotData();
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

      doc.setFontSize(18);
      doc.text("Bookkeeping Report", 40, 48);
      doc.setFontSize(10);
      doc.text(`Period: ${snapshot.dateRange.startDate} to ${snapshot.dateRange.endDate}`, 40, 66);
      doc.text(`Generated: ${formatDateTime(selectedReport.generatedAt)}`, 40, 82);

      autoTable(doc, {
        startY: 106,
        head: [["Metric", "Value"]],
        body: [
          ["Gross Sales", formatCurrency(snapshot.summary.grossSales)],
          ["Net Sales", formatCurrency(snapshot.summary.netSales)],
          ["Tax Collected", formatCurrency(snapshot.summary.taxCollected)],
          ["Food Cost", formatCurrency(snapshot.summary.estimatedCogs)],
          ["Gross Profit", formatCurrency(snapshot.summary.grossProfit)],
          ["Operating Expenses", formatCurrency(snapshot.summary.operatingExpenses)],
          ["Net Profit Estimate", formatCurrency(snapshot.summary.netProfitEstimate)],
          ["Cash Sales", formatCurrency(snapshot.summary.cashExpected)],
          ["Open Exceptions", String(snapshot.summary.unresolvedExceptions)],
        ],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [17, 24, 39] },
      });

      autoTable(doc, {
        startY: (doc as AutoTableDocument).lastAutoTable?.finalY
          ? ((doc as AutoTableDocument).lastAutoTable?.finalY ?? 0) + 24
          : 260,
        head: [["Payment Method", "Orders", "Amount"]],
        body: snapshot.paymentBreakdown.map((row) => [
          row.method,
          String(row.orders),
          formatCurrency(row.amount),
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [17, 24, 39] },
      });

      autoTable(doc, {
        startY: (doc as AutoTableDocument).lastAutoTable?.finalY
          ? ((doc as AutoTableDocument).lastAutoTable?.finalY ?? 0) + 24
          : 360,
        head: [["Menu", "Sold", "Revenue", "Food Cost", "Profit", "Status"]],
        body: snapshot.menuMargins.map((row) => [
          row.menuName,
          String(row.quantitySold),
          formatCurrency(row.revenue),
          formatCurrency(row.estimatedCogs),
          formatCurrency(row.grossProfit),
          formatLabel(row.status),
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [17, 24, 39] },
      });

      downloadBlob(
        `bookkeeping-report-${snapshot.dateRange.startDate}-to-${snapshot.dateRange.endDate}.pdf`,
        new Blob([doc.output("arraybuffer")], { type: "application/pdf" }),
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
  const detailExpenses = selectedSnapshot.expenses ?? data.expenses;
  const detailShiftClosings = selectedSnapshot.shiftClosings ?? data.shiftClosings;
  const detailExceptions = selectedSnapshot.exceptions ?? data.exceptions;
  const detailMenuMargins = selectedSnapshot.menuMargins ?? data.menuMargins;
  const detailExpenseTotal = detailExpenses.reduce((sum, row) => sum + row.amount, 0);
  const detailOpenExceptionCount = detailExceptions.filter((row) => row.status !== "resolved").length;
  const detailCompletedClosingCount = detailShiftClosings.filter((row) =>
    ["submitted", "closed"].includes(row.status),
  ).length;
  const detailReadyMarginCount = detailMenuMargins.filter((row) => row.status === "ready").length;
  const detailCashSales = detailPaymentBreakdown
    .filter((row) => row.method.toLowerCase() === "cash")
    .reduce((sum, row) => sum + row.amount, 0);
  const detailNonCashSales = detailPaymentBreakdown.reduce((sum, row) => sum + row.amount, 0) - detailCashSales;

  return (
    <div className="space-y-4">
      <StandardPanel
        title="Report History"
        description="Generated bookkeeping reports for owner review. Open a report to download PDF or Excel."
        action={
          <div className="flex flex-wrap gap-2">
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
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void exportReportExcel()}
                disabled={exportingExcel}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm transition hover:border-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {exportingExcel ? "Exporting Excel..." : "Download Excel"}
              </button>
              <button
                type="button"
                onClick={() => void exportReportPdf()}
                disabled={exportingPdf}
                className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
              >
                {exportingPdf ? "Exporting PDF..." : "Download PDF"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm transition hover:border-gray-900"
              >
                Close Detail
              </button>
            </div>
          }
        >
          {exportError ? (
            <div className="mb-4 rounded-xl border border-[#F6C99F] bg-[#FFF1E6] p-3 text-sm font-semibold text-[#B45309]">
              {exportError}
            </div>
          ) : null}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-normal text-gray-500">
                  {formatLabel(selectedReport.type)}
                </p>
                <h3 className="mt-1 text-xl font-bold text-gray-950">{selectedReport.period}</h3>
              </div>
              <SemanticBadge tone="success">{formatLabel(selectedReport.status)}</SemanticBadge>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-bold text-gray-500">Net Sales</p>
              <p className="mt-2 text-lg font-bold text-gray-950">{formatCurrency(detailSummary.netSales)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-bold text-gray-500">Food Cost</p>
              <p className="mt-2 text-lg font-bold text-gray-950">{formatCurrency(detailSummary.estimatedCogs)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-bold text-gray-500">Net Profit Estimate</p>
              <p className="mt-2 text-lg font-bold text-gray-950">{formatCurrency(detailSummary.netProfitEstimate)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-bold text-gray-500">Tax Collected</p>
              <p className="mt-2 text-lg font-bold text-gray-950">{formatCurrency(detailSummary.taxCollected)}</p>
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
              <h3 className="text-base font-bold text-gray-950">Review Checklist</h3>
              <div className="mt-3 space-y-2 text-sm text-gray-600">
                <p>
                  <span className="font-semibold text-gray-900">Cash sales:</span>{" "}
                  {formatCurrency(detailCashSales)}
                </p>
                <p>
                  <span className="font-semibold text-gray-900">Non-cash sales:</span>{" "}
                  {formatCurrency(detailNonCashSales)}
                </p>
                <p>
                  <span className="font-semibold text-gray-900">Shift closings:</span>{" "}
                  {detailShiftClosings.length > 0
                    ? `${detailCompletedClosingCount} of ${detailShiftClosings.length} submitted or closed`
                    : "No shift closing captured"}
                </p>
                <p>
                  <span className="font-semibold text-gray-900">Recorded expenses:</span>{" "}
                  {formatCurrency(detailExpenseTotal)}
                </p>
                <p>
                  <span className="font-semibold text-gray-900">Open review items:</span>{" "}
                  {detailOpenExceptionCount}
                </p>
                <p>
                  <span className="font-semibold text-gray-900">Menu margins:</span>{" "}
                  {detailMenuMargins.length > 0
                    ? `${detailReadyMarginCount} of ${detailMenuMargins.length} ready`
                    : "No sold menu items captured"}
                </p>
              </div>
            </div>
          </div>

          <p className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-600">
            This report is a frozen business summary for the selected period. PDF is for owner review;
            Excel is for accounting handoff.
          </p>
        </StandardPanel>
      ) : null}
    </div>
  );
}
