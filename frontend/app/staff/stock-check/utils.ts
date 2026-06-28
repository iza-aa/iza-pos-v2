import type {
  InventoryItem,
  KitchenReportCondition,
  KitchenReportLevel,
  ReportStatus,
  ReportType,
  StationBatch,
  StationScope,
  TestingPurpose,
} from "./types";
import {
  kitchenReportConditionOptions,
  kitchenReportLevelOptions,
  testingPurposeOptions,
} from "./constants";

export const getKitchenReportConditionLabel = (value: KitchenReportCondition) =>
  kitchenReportConditionOptions.find((option) => option.value === value)?.label || value;

export const getKitchenReportLevelLabel = (value: KitchenReportLevel) =>
  kitchenReportLevelOptions.find((option) => option.value === value)?.label || "";

export const getKitchenReportSignal = (condition: KitchenReportCondition, level: KitchenReportLevel) => {
  const conditionLabel = getKitchenReportConditionLabel(condition);
  const levelLabel = getKitchenReportLevelLabel(level);

  if (condition === "ok") return levelLabel || conditionLabel;
  return levelLabel ? `${conditionLabel} · ${levelLabel}` : conditionLabel;
};

export const getTestingPurposeLabel = (value: TestingPurpose) =>
  testingPurposeOptions.find((option) => option.value === value)?.label || "Testing";

export const reportTypeLabel = (type: ReportType) => {
  if (type === "low_stock") return "Low Stock";
  if (type === "out_of_stock") return "Out of Stock";
  if (type === "waste_damaged") return "Waste/Damaged";
  if (type === "testing_usage") return "Testing Usage";
  return "Restock Request";
};

export const statusClassName = (status: ReportStatus) => {
  if (status === "resolved") {
    return "border-green-200 bg-green-50 text-green-700";
  }
  if (status === "rejected") return "border-red-200 bg-red-50 text-red-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
};

export const statusLabel = (status: ReportStatus | "all") => {
  if (status === "all") return "All";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export const normalizeInventoryStatus = (item: InventoryItem) => {
  const currentStock = item.current_stock ?? 0;
  const reorderLevel = item.reorder_level ?? 0;

  if (currentStock <= 0) return "out-of-stock";
  if (currentStock <= reorderLevel) return "low-stock";

  return "in-stock";
};

export const getInventoryStatusMeta = (status: "in-stock" | "low-stock" | "out-of-stock") => {
  switch (status) {
    case "in-stock":
      return {
        label: "In Stock",
        className: "bg-[#D8F999] text-gray-900 border border-[#C3EE78]",
      };
    case "low-stock":
      return {
        label: "Low Stock",
        className: "bg-[#FFE02E] text-gray-900 border border-[#F4CF12]",
      };
    case "out-of-stock":
      return {
        label: "Critical",
        className: "bg-[#FFE1E1] text-[#C00000] border border-[#FFC7C7]",
      };
    default:
      return {
        label: "Unknown",
        className: "bg-gray-100 text-gray-700 border border-gray-200",
      };
  }
};

export const getStockTextClassName = (status: "in-stock" | "low-stock" | "out-of-stock") => {
  if (status === "out-of-stock") return "text-[#C00000]";
  if (status === "low-stock") return "text-[#D8A800]";
  return "text-gray-900";
};

export const stationScopeLabel = (value?: StationScope | null) => {
  if (value === "barista") return "Barista";
  if (value === "kitchen") return "Kitchen";
  return "Shared";
};

export const trackingModeLabel = (value?: InventoryItem["tracking_mode"]) => {
  if (value === "kitchen_station_auto_deduct") return "Kitchen Station";
  if (value === "bulk_usage_expense") return "Bulk Usage";
  return "Direct Auto";
};

export const stationStatusLabel = (value: StationBatch["station_status"]) => {
  if (value === "thawing") return "Thawing";
  if (value === "prep") return "Prep";
  if (value === "ready") return "Ready";
  if (value === "finished") return "Finished by POS";
  if (value === "waste") return "Waste";
  return "In Kitchen";
};

export const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getDateAfterDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

export const getDefaultKitchenShiftName = () => {
  const hour = new Date().getHours();
  return hour >= 15 || hour < 5 ? "Shift Malam" : "Shift Pagi";
};

export const omitStationScope = <T extends { station_scope?: unknown }>(payload: T) => {
  const fallback = { ...payload };
  delete fallback.station_scope;
  return fallback;
};

export const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message?: unknown }).message || "");
    if (message) return message;
  }
  return fallback;
};

export const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};
