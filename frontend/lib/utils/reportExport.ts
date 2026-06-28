"use client";

import type {
  ReportCell,
  ReportExportFormat,
  ReportExportOptions,
} from "./reportExportTypes";
import {
  formatReportValue,
  getReportCellHeader,
  getReportNumberFormat,
} from "./reportFormatting";

export type {
  ReportCell,
  ReportExportFormat,
  ReportExportOptions,
  ReportSheet,
} from "./reportExportTypes";

const BRAND_DARK = "111827";
const BRAND_ACCENT = "4C46DA";
const LIGHT_ACCENT = "EEF2FF";
const LIGHT_ROW = "F8FAFC";
const BORDER = "D1D5DB";

const sanitizeFilename = (filename: string) =>
  filename.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-").replace(/\s+/g, "-");

const sanitizeSheetName = (name: string) => {
  const sanitized = name.replace(/[\\/?*[\]:]/g, " ").trim();
  return sanitized.slice(0, 31) || "Sheet";
};

const asText = (value: ReportCell) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

const getFilename = (filename: string, extension: ReportExportFormat) => {
  const base = filename.replace(/\.(xlsx|docx|pdf)$/i, "");
  return `${sanitizeFilename(base)}.${extension}`;
};

const getColumnWidth = (rows: ReportCell[][], columnIndex: number) => {
  const longest = rows.reduce(
    (length, row) => Math.max(length, asText(row[columnIndex]).length),
    0,
  );
  return Math.min(42, Math.max(12, longest + 3));
};

const isNumericColumn = (rows: ReportCell[][], columnIndex: number) =>
  rows.slice(1).some((row) => typeof row[columnIndex] === "number");

async function exportXlsx(options: ReportExportOptions) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "IZA POS";
  workbook.created = new Date();
  workbook.modified = new Date();

  options.sheets.forEach((sheet, sheetIndex) => {
    const worksheet = workbook.addWorksheet(sanitizeSheetName(sheet.name), {
      views: [{ state: "frozen", ySplit: 6, showGridLines: false }],
      properties: { defaultRowHeight: 20 },
    });
    const columnCount = Math.max(1, ...sheet.rows.map((row) => row.length));
    const lastColumn = worksheet.getColumn(columnCount).letter;

    worksheet.mergeCells(`A1:${lastColumn}1`);
    worksheet.getCell("A1").value = options.title;
    worksheet.getCell("A1").font = {
      name: "Aptos Display",
      size: 18,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    worksheet.getCell("A1").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${BRAND_DARK}` },
    };
    worksheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
    worksheet.getRow(1).height = 32;

    worksheet.mergeCells(`A2:${lastColumn}2`);
    worksheet.getCell("A2").value = options.subtitle || sheet.name;
    worksheet.getCell("A2").font = {
      name: "Aptos",
      size: 11,
      bold: true,
      color: { argb: `FF${BRAND_ACCENT}` },
    };
    worksheet.getCell("A2").alignment = { vertical: "middle", horizontal: "left" };

    worksheet.mergeCells(`A3:${lastColumn}3`);
    worksheet.getCell("A3").value = `Generated: ${new Date().toLocaleString("id-ID")}`;
    worksheet.getCell("A3").font = {
      name: "Aptos",
      size: 9,
      color: { argb: "FF6B7280" },
    };

    worksheet.mergeCells(`A4:${lastColumn}4`);
    worksheet.getCell("A4").value = sheet.name;
    worksheet.getCell("A4").font = {
      name: "Aptos",
      size: 12,
      bold: true,
      color: { argb: `FF${BRAND_DARK}` },
    };
    worksheet.getCell("A4").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${LIGHT_ACCENT}` },
    };
    worksheet.getCell("A4").alignment = { vertical: "middle", horizontal: "left" };
    worksheet.getRow(4).height = 24;
    worksheet.mergeCells(`A5:${lastColumn}5`);
    worksheet.getCell("A5").value =
      sheet.description || "Detailed data for this report section.";
    worksheet.getCell("A5").font = {
      name: "Aptos",
      size: 9,
      italic: true,
      color: { argb: "FF6B7280" },
    };
    worksheet.getCell("A5").alignment = {
      vertical: "middle",
      horizontal: "left",
      wrapText: true,
    };
    worksheet.getRow(5).height = 22;

    if (sheet.rows.length > 0) {
      sheet.rows.forEach((row) => worksheet.addRow(row.map((value) => value ?? "")));
      const headerRow = worksheet.getRow(6);
      headerRow.height = 26;
      headerRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = {
          name: "Aptos",
          size: 10,
          bold: true,
          color: { argb: "FFFFFFFF" },
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: `FF${BRAND_ACCENT}` },
        };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.border = {
          top: { style: "thin", color: { argb: `FF${BORDER}` } },
          left: { style: "thin", color: { argb: `FF${BORDER}` } },
          bottom: { style: "thin", color: { argb: `FF${BORDER}` } },
          right: { style: "thin", color: { argb: `FF${BORDER}` } },
        };
      });

      for (let rowIndex = 7; rowIndex <= worksheet.rowCount; rowIndex += 1) {
        const row = worksheet.getRow(rowIndex);
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.font = { name: "Aptos", size: 10, color: { argb: `FF${BRAND_DARK}` } };
          cell.alignment = {
            vertical: "middle",
            horizontal: typeof cell.value === "number" ? "right" : "left",
            wrapText: true,
          };
          cell.border = {
            bottom: { style: "hair", color: { argb: `FF${BORDER}` } },
          };
          if (rowIndex % 2 === 0) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: `FF${LIGHT_ROW}` },
            };
          }

          if (
            typeof cell.value === "number" &&
            sheet.rows[0]?.length === 2 &&
            Number(cell.col) === 2
          ) {
            cell.numFmt = getReportNumberFormat(
              asText(sheet.rows[rowIndex - 6]?.[0]),
            );
          }
        });
      }

      worksheet.autoFilter = {
        from: { row: 6, column: 1 },
        to: { row: 6, column: columnCount },
      };
    }

    for (let columnIndex = 1; columnIndex <= columnCount; columnIndex += 1) {
      const column = worksheet.getColumn(columnIndex);
      column.width = getColumnWidth(sheet.rows, columnIndex - 1);
      const header = asText(sheet.rows[0]?.[columnIndex - 1]);
      const mixedSummaryValueColumn =
        sheet.rows[0]?.length === 2 && columnIndex === 2;
      if (
        !mixedSummaryValueColumn &&
        isNumericColumn(sheet.rows, columnIndex - 1)
      ) {
        column.numFmt = getReportNumberFormat(header);
      }
    }

    worksheet.pageSetup = {
      orientation: columnCount > 7 ? "landscape" : "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.35,
        right: 0.35,
        top: 0.5,
        bottom: 0.5,
        header: 0.2,
        footer: 0.2,
      },
    };
    worksheet.headerFooter.oddFooter =
      `&LIZA POS - ${sheet.name}&RPage &P of &N`;
    if (sheetIndex === 0) worksheet.pageSetup.firstPageNumber = 1;
  });

  const output = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([output as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    getFilename(options.filename, "xlsx"),
  );
}

async function exportDocx(options: ReportExportOptions) {
  const response = await fetch("/api/owner/reports/export/docx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(result.error || "Word report could not be generated.");
  }

  downloadBlob(await response.blob(), getFilename(options.filename, "docx"));
}

async function exportPdf(options: ReportExportOptions) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default;
  const maxColumns = Math.max(
    1,
    ...options.sheets.flatMap((sheet) => sheet.rows.map((row) => row.length)),
  );
  const orientation = maxColumns > 6 ? "landscape" : "portrait";
  const document = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pageWidth = document.internal.pageSize.getWidth();
  let cursorY = 18;

  document.setFillColor(17, 24, 39);
  document.rect(0, 0, pageWidth, 30, "F");
  document.setTextColor(255, 255, 255);
  document.setFont("helvetica", "bold");
  document.setFontSize(18);
  document.text(options.title, 12, 14);
  document.setFont("helvetica", "normal");
  document.setFontSize(9);
  document.text(options.subtitle || "Owner dashboard report", 12, 21);
  document.text(`Generated: ${new Date().toLocaleString("id-ID")}`, 12, 26);
  cursorY = 38;

  options.sheets.forEach((sheet, sheetIndex) => {
    if (sheetIndex > 0 && cursorY > document.internal.pageSize.getHeight() - 45) {
      document.addPage();
      cursorY = 18;
    }

    document.setTextColor(17, 24, 39);
    document.setFont("helvetica", "bold");
    document.setFontSize(13);
    document.text(sheet.name, 12, cursorY);
    cursorY += 5;
    document.setFont("helvetica", "italic");
    document.setFontSize(8);
    document.setTextColor(107, 114, 128);
    const description = document.splitTextToSize(
      sheet.description || "Detailed data for this report section.",
      pageWidth - 24,
    );
    document.text(description, 12, cursorY);
    cursorY += description.length * 3.5 + 2;

    const [header = [], ...body] = sheet.rows;
    autoTable(document, {
      startY: cursorY,
      head: [header.map(asText)],
      body: body.map((row, rowIndex) =>
        row.map((value, columnIndex) =>
          formatReportValue(
            value,
            getReportCellHeader(sheet.rows, rowIndex + 1, columnIndex),
          ),
        ),
      ),
      theme: "grid",
      margin: { left: 12, right: 12, top: 16, bottom: 14 },
      styles: {
        font: "helvetica",
        fontSize: maxColumns > 8 ? 6.5 : 8,
        cellPadding: 2,
        lineColor: [209, 213, 219],
        lineWidth: 0.15,
        textColor: [17, 24, 39],
        overflow: "linebreak",
        valign: "middle",
      },
      headStyles: {
        fillColor: [76, 70, 218],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "center",
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didDrawPage: (data) => {
        const pageHeight = document.internal.pageSize.getHeight();
        document.setFont("helvetica", "normal");
        document.setFontSize(8);
        document.setTextColor(107, 114, 128);
        document.text("IZA POS", 12, pageHeight - 6);
        document.text(
          `Page ${data.pageNumber}`,
          pageWidth - 12,
          pageHeight - 6,
          { align: "right" },
        );
      },
    });

    cursorY =
      ((document as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ?? cursorY) + 10;
  });

  document.save(getFilename(options.filename, "pdf"));
}

export async function exportReport(
  format: ReportExportFormat,
  options: ReportExportOptions,
) {
  if (format === "xlsx") return exportXlsx(options);
  if (format === "docx") return exportDocx(options);
  return exportPdf(options);
}

export const getReportExportItems = ({
  onExport,
  disabled = false,
}: {
  onExport: (format: ReportExportFormat) => void;
  disabled?: boolean;
}) => [
  {
    id: "xlsx",
    label: "Excel (.xlsx)",
    onClick: () => onExport("xlsx"),
    disabled,
  },
  {
    id: "docx",
    label: "Word / Docs (.docx)",
    onClick: () => onExport("docx"),
    disabled,
  },
  {
    id: "pdf",
    label: "PDF (.pdf)",
    onClick: () => onExport("pdf"),
    disabled,
  },
];
