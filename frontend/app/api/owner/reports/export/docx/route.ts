import { NextRequest, NextResponse } from "next/server";
import { buildDocxReport } from "@/lib/services/reports/docxReportService";
import type { ReportExportOptions } from "@/lib/utils/reportExportTypes";

export const runtime = "nodejs";

const isReportOptions = (value: unknown): value is ReportExportOptions => {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<ReportExportOptions>;
  return (
    typeof report.filename === "string" &&
    typeof report.title === "string" &&
    Array.isArray(report.sheets) &&
    report.sheets.length > 0 &&
    report.sheets.every((sheet) =>
      Boolean(sheet) &&
      typeof sheet.name === "string" &&
      Array.isArray(sheet.rows),
    )
  );
};

export async function POST(request: NextRequest) {
  if (
    !request.headers.get("x-user-id") ||
    request.headers.get("x-user-role") !== "owner"
  ) {
    return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  }

  try {
    const payload: unknown = await request.json();
    if (!isReportOptions(payload)) {
      return NextResponse.json({ error: "Invalid report data." }, { status: 400 });
    }

    const buffer = await buildDocxReport(payload);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": "attachment; filename=owner-report.docx",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to generate owner DOCX report:", error);
    return NextResponse.json(
      { error: "Word report could not be generated." },
      { status: 500 },
    );
  }
}
