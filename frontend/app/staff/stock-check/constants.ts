import { ArchiveBoxIcon, ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import type { KitchenReportCondition, KitchenReportLevel, ReportType, TestingPurpose, StockCheckTab } from "./types";

export const kitchenShiftOptions = ["Shift Pagi", "Shift Malam"] as const;

export const kitchenReportConditionOptions: Array<{ value: KitchenReportCondition; label: string }> = [
  { value: "ok", label: "OK" },
  { value: "handover", label: "Handover note" },
  { value: "waste", label: "Waste" },
  { value: "need_prep", label: "Need prep" },
  { value: "adjusted", label: "Adjusted count" },
];

export const kitchenReportLevelOptions: Array<{ value: KitchenReportLevel; label: string }> = [
  { value: "", label: "No level" },
  { value: "full", label: "Full" },
  { value: "three_quarter", label: "3/4" },
  { value: "half", label: "Half" },
  { value: "quarter", label: "1/4" },
  { value: "low", label: "Low" },
  { value: "empty", label: "Empty" },
];

export const stockCheckTabs: Array<{
  id: StockCheckTab;
  label: string;
  description: string;
  icon: typeof ArchiveBoxIcon;
}> = [
  {
    id: "stock-check",
    label: "Stock Check",
    description: "View station materials",
    icon: ArchiveBoxIcon,
  },
  {
    id: "kitchen-station",
    label: "Kitchen Station",
    description: "Prep status",
    icon: ClipboardDocumentListIcon,
  },
  {
    id: "my-reports",
    label: "My Reports",
    description: "Submitted reports",
    icon: ClipboardDocumentListIcon,
  },
];

export const reportOptions: Array<{
  type: ReportType;
  label: string;
  description: string;
}> = [
  { type: "low_stock", label: "Report Low Stock", description: "Stock is close to minimum" },
  { type: "out_of_stock", label: "Report Out of Stock", description: "Material is unavailable" },
  { type: "waste_damaged", label: "Report Waste/Damaged", description: "Lost, damaged, or unusable" },
  { type: "restock_request", label: "Request Restock", description: "Ask manager to restock" },
];

export const testingPurposeOptions: Array<{ value: TestingPurpose; label: string }> = [
  { value: "coffee_calibration", label: "Coffee Calibration" },
  { value: "taste_test", label: "Taste Test" },
  { value: "menu_trial", label: "Menu Trial" },
  { value: "staff_training", label: "Staff Training" },
  { value: "quality_check", label: "Quality Check" },
  { value: "other", label: "Other" },
];
