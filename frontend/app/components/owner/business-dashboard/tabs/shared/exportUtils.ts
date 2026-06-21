"use client";

import {
  exportReport,
  type ReportCell,
  type ReportSheet,
} from "@/lib/utils/reportExport";

export type WorkbookSheet = {
  name: string;
  description?: string;
  rows: ReportCell[][];
};

export async function exportWorkbook(filename: string, sheets: WorkbookSheet[]) {
  return exportReport("xlsx", {
    filename,
    title: "IZA POS Owner Report",
    sheets: sheets as ReportSheet[],
  });
}
