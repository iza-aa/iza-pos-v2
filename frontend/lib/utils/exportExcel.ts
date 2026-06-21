"use client";

import { exportReport, type ReportCell } from "./reportExport";

export type ExcelCell = ReportCell;

export type ExcelSheet = {
  name: string;
  description?: string;
  rows: ExcelCell[][];
};

export async function downloadXlsxWorkbook(filename: string, sheets: ExcelSheet[]) {
  return exportReport("xlsx", {
    filename,
    title: "IZA POS Owner Report",
    sheets,
  });
}
