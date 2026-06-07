"use client";

export type ExcelCell = string | number | boolean | null | undefined;

export type ExcelSheet = {
  name: string;
  rows: ExcelCell[][];
};

const sanitizeSheetName = (name: string) => {
  const sanitized = name.replace(/[\\/?*[\]:]/g, " ").trim();
  return sanitized.slice(0, 31) || "Sheet";
};

export async function downloadXlsxWorkbook(filename: string, sheets: ExcelSheet[]) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  sheets.forEach((sheet) => {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(sheet.rows),
      sanitizeSheetName(sheet.name),
    );
  });

  const output = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([output], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
