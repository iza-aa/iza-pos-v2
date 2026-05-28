import type { DateRangeValue } from "@/app/components/shared";

export type BookkeepingTab =
  | "closings"
  | "ledger"
  | "cost-margin"
  | "expenses"
  | "exceptions"
  | "reports";

export type ClosingSection = "shift" | "daily";

export type BookkeepingEntryType =
  | "sales_income"
  | "discount_cost"
  | "tax_payable"
  | "cogs_estimate"
  | "stock_purchase"
  | "cancellation_adjustment"
  | "expense"
  | "manual_adjustment"
  | "data_exception";

export type BookkeepingDirection = "in" | "out" | "neutral";

export type BookkeepingStatus =
  | "posted"
  | "estimated"
  | "needs_review"
  | "cost_data_needed";

export type BookkeepingEntry = {
  id: string;
  entryAt: string;
  businessDate: string;
  type: BookkeepingEntryType;
  category: string;
  source: string;
  sourceTable?: string;
  sourceId?: string;
  paymentMethod?: string;
  direction: BookkeepingDirection;
  amount: number;
  status: BookkeepingStatus;
  note?: string;
};

export type BookkeepingException = {
  id: string;
  businessDate: string;
  severity: "low" | "medium" | "high";
  type: string;
  description: string;
  source: string;
  suggestedFix: string;
  status: "open" | "acknowledged" | "resolved";
};

export type BookkeepingExpense = {
  id: string;
  expenseDate: string;
  category: string;
  amount: number;
  paymentMethod?: string | null;
  vendor?: string | null;
  receiptUrl?: string | null;
  note?: string | null;
};

export type BookkeepingReport = {
  id: string;
  name: string;
  type: string;
  period: string;
  generatedAt: string;
  status: "generated" | "draft";
  snapshotJson?: unknown;
};

export type MenuMarginRow = {
  id: string;
  menuName: string;
  quantitySold: number;
  revenue: number;
  estimatedCogs: number | null;
  grossProfit: number | null;
  marginPct: number | null;
  status: "ready" | "cost_data_needed" | "recipe_needed";
};

export type ShiftClosingRow = {
  id: string;
  shiftName: string;
  businessDate: string;
  openedAt?: string | null;
  closedAt?: string | null;
  grossSales: number;
  discountTotal: number;
  netSales: number;
  openingCash: number;
  cashExpected: number;
  expectedDrawerCash: number;
  cashCounted?: number | null;
  cashDifference?: number | null;
  cashToDeposit: number;
  closingFloat: number;
  floatPolicy: "carry_float" | "new_float" | "deposit_all";
  nonCashSales: number;
  cancelledCount: number;
  status: "open" | "draft" | "needs_review" | "submitted" | "closed" | "reopened";
};

export type DailyClosingRow = {
  id: string;
  businessDate: string;
  grossSales: number;
  discountTotal: number;
  netSales: number;
  cogsEstimate: number;
  expenseTotal: number;
  grossProfitEstimate: number;
  netProfitEstimate: number;
  openingCashTotal: number;
  cashExpected: number;
  expectedDrawerCash: number;
  cashCounted?: number | null;
  cashDifference?: number | null;
  cashToDeposit: number;
  closingFloatTotal: number;
  unresolvedExceptionCount: number;
  status: "draft" | "needs_review" | "ready_to_close" | "closed" | "reopened";
  approvedAt?: string | null;
  notes?: string | null;
};

export type PaymentBreakdownRow = {
  method: string;
  orders: number;
  amount: number;
};

export type BookkeepingSummary = {
  grossSales: number;
  discounts: number;
  netSales: number;
  taxCollected: number;
  estimatedCogs: number | null;
  grossProfit: number | null;
  operatingExpenses: number;
  netProfitEstimate: number | null;
  openingCashTotal: number;
  cashExpected: number;
  expectedDrawerCash: number;
  cashToDeposit: number;
  closingFloatTotal: number;
  cashDifference: number | null;
  totalOrders: number;
  cancelledOrders: number;
  unresolvedExceptions: number;
};

export type BookkeepingDashboardData = {
  dateRange: DateRangeValue;
  summary: BookkeepingSummary;
  paymentBreakdown: PaymentBreakdownRow[];
  entries: BookkeepingEntry[];
  expenses: BookkeepingExpense[];
  exceptions: BookkeepingException[];
  reports: BookkeepingReport[];
  menuMargins: MenuMarginRow[];
  shiftClosings: ShiftClosingRow[];
  dailyClosing?: DailyClosingRow | null;
};

export type BookkeepingFinancialSettings = {
  taxEnabled: boolean;
  taxLabel: string;
  taxRate: number;
  serviceChargeEnabled: boolean;
  serviceChargeRate: number;
  pricesIncludeTax: boolean;
  updatedAt?: string | null;
  updatedBy?: string | null;
};
