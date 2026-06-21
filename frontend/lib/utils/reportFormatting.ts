import type { ReportCell } from "./reportExportTypes";

const normalizeHeader = (header: string) => header.trim().toLowerCase();

export const isPercentReportHeader = (header: string) =>
  /margin|rate|percentage|percent|rasio|share/.test(normalizeHeader(header));

export const isScoreReportHeader = (header: string) =>
  /score|index|indeks/.test(normalizeHeader(header));

export const isCurrencyReportHeader = (header: string) =>
  /amount|revenue|sales|cost|value|profit|discount|aov|hpp|price|cash|expense|biaya|penjualan|harga|order total|transaction total/.test(
    normalizeHeader(header),
  );

export const isCountReportHeader = (header: string) =>
  /(^|\s)(orders?|count|quantity|qty|stock|days|sold|attendance|score|items?|reports?|staff|jumlah|kuantitas|pesanan|terjual|item|laporan)(\s|$)/.test(
    normalizeHeader(header),
  );

export const getReportNumberFormat = (header: string) => {
  if (isPercentReportHeader(header)) return '0.00"%"';
  if (isScoreReportHeader(header)) return "0.00";
  if (isCurrencyReportHeader(header)) return '"Rp" #,##0';
  if (isCountReportHeader(header)) return "#,##0";
  return "#,##0.00";
};

export const formatReportValue = (value: ReportCell, header: string) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value !== "number") return String(value);

  if (isPercentReportHeader(header)) {
    return `${value.toLocaleString("id-ID", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    })}%`;
  }

  if (isScoreReportHeader(header)) {
    return value.toLocaleString("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  if (isCurrencyReportHeader(header)) {
    return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
  }

  return value.toLocaleString("id-ID", {
    maximumFractionDigits: isCountReportHeader(header) ? 0 : 2,
  });
};

export const getReportCellHeader = (
  rows: ReportCell[][],
  rowIndex: number,
  columnIndex: number,
) => {
  if (rows[0]?.length === 2 && columnIndex === 1 && rowIndex > 0) {
    return String(rows[rowIndex]?.[0] ?? "");
  }

  return String(rows[0]?.[columnIndex] ?? "");
};
