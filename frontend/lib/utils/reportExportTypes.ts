export type ReportCell = string | number | boolean | null | undefined;

export type ReportSheet = {
  name: string;
  description?: string;
  rows: ReportCell[][];
};

export type ReportExportFormat = "xlsx" | "docx" | "pdf";

export type ReportExportOptions = {
  filename: string;
  title: string;
  subtitle?: string;
  sheets: ReportSheet[];
};
