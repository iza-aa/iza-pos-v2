import { isTableQrToken } from "../services/table/qrToken.js";

const LEGACY_TABLE_QR_VALUE_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isTableQrValue(value) {
  return typeof value === "string" && (
    isTableQrToken(value) || LEGACY_TABLE_QR_VALUE_PATTERN.test(value)
  );
}

export function extractTableQrValue(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    const url = new URL(value.trim());
    const segments = url.pathname.split("/").filter(Boolean);
    const tableIndex = segments.findIndex((segment) => segment === "table");
    const tableValue = tableIndex >= 0 ? segments[tableIndex + 1] : null;
    const decodedValue = tableValue ? decodeURIComponent(tableValue).trim() : "";

    return isTableQrValue(decodedValue) ? decodedValue : null;
  } catch {
    return null;
  }
}
