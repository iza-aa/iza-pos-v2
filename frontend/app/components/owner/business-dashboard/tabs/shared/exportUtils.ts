"use client";

export type WorkbookSheet = {
  name: string;
  rows: unknown[][];
};

const sanitizeSheetName = (name: string) => name.replace(/[\\/?*[\]:]/g, " ").slice(0, 31);

export async function exportWorkbook(filename: string, sheets: WorkbookSheet[]) {
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
  const url = URL.createObjectURL(
    new Blob([output], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
