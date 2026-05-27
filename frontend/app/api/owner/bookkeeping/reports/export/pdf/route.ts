import { NextRequest, NextResponse } from "next/server";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { DateRangeValue } from "@/app/components/shared";
import { loadBookkeepingDashboardDataFromClient } from "@/lib/services/bookkeeping/bookkeepingService";
import { formatJakartaDisplayDateTime } from "@/lib/services/bookkeeping/bookkeepingDate";
import { createBookkeepingSupabaseClient } from "@/lib/services/bookkeeping/bookkeepingServer";

export const runtime = "nodejs";

type ExportPdfRequest = {
  dateRange?: Partial<DateRangeValue>;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const getRequester = (request: NextRequest) => ({
  id: request.headers.get("x-user-id") ?? "",
  role: request.headers.get("x-user-role") ?? "",
});

const normalizeDateRange = (value: ExportPdfRequest["dateRange"]): DateRangeValue | null => {
  const startDate = value?.startDate ?? "";
  const endDate = value?.endDate ?? "";

  if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(endDate)) return null;
  if (startDate > endDate) return null;

  return { startDate, endDate };
};

const formatCurrency = (value: number | null) => {
  if (value === null) return "-";
  return `Rp ${value.toLocaleString("id-ID")}`;
};

export async function POST(request: NextRequest) {
  const requester = getRequester(request);

  if (!requester.id || requester.role !== "owner") {
    return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as ExportPdfRequest;
  const dateRange = normalizeDateRange(body.dateRange);

  if (!dateRange) {
    return NextResponse.json({ error: "Valid date range is required." }, { status: 400 });
  }

  try {
    const supabase = createBookkeepingSupabaseClient();
    const data = await loadBookkeepingDashboardDataFromClient(supabase, dateRange);
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

    doc.setFontSize(18);
    doc.text("Bookkeeping Report", 40, 48);
    doc.setFontSize(10);
    doc.text(`Period: ${dateRange.startDate} to ${dateRange.endDate}`, 40, 66);
    doc.text(`Generated: ${formatJakartaDisplayDateTime(new Date().toISOString())}`, 40, 82);

    autoTable(doc, {
      startY: 106,
      head: [["Metric", "Value"]],
      body: [
        ["Gross Sales", formatCurrency(data.summary.grossSales)],
        ["Net Sales", formatCurrency(data.summary.netSales)],
        ["Estimated COGS", formatCurrency(data.summary.estimatedCogs)],
        ["Gross Profit", formatCurrency(data.summary.grossProfit)],
        ["Operating Expenses", formatCurrency(data.summary.operatingExpenses)],
        ["Net Profit Estimate", formatCurrency(data.summary.netProfitEstimate)],
        ["Cash Sales", formatCurrency(data.summary.cashExpected)],
        ["Expected Drawer", formatCurrency(data.summary.expectedDrawerCash)],
        ["Cash To Deposit", formatCurrency(data.summary.cashToDeposit)],
        ["Open Exceptions", String(data.summary.unresolvedExceptions)],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [17, 24, 39] },
    });

    autoTable(doc, {
      startY: (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
        ? (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24
        : 260,
      head: [["Menu", "Sold", "Revenue", "COGS", "Profit", "Status"]],
      body: data.menuMargins.map((row) => [
        row.menuName,
        String(row.quantitySold),
        formatCurrency(row.revenue),
        formatCurrency(row.estimatedCogs),
        formatCurrency(row.grossProfit),
        row.status.replaceAll("_", " "),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [17, 24, 39] },
    });

    autoTable(doc, {
      startY: (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
        ? (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24
        : 420,
      head: [["Date", "Category", "Amount", "Payment", "Vendor"]],
      body: data.expenses.map((row) => [
        row.expenseDate,
        row.category,
        formatCurrency(row.amount),
        row.paymentMethod || "-",
        row.vendor || "-",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [17, 24, 39] },
    });

    const arrayBuffer = doc.output("arraybuffer");

    return new NextResponse(Buffer.from(arrayBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="bookkeeping-${dateRange.startDate}-to-${dateRange.endDate}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Failed to export bookkeeping PDF:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "Bookkeeping PDF could not be exported.",
      },
      { status: 500 },
    );
  }
}
