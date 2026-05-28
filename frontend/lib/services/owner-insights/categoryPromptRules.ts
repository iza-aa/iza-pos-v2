import type { OwnerInsightCategory } from "./insightSchema";

export type CategoryPromptRule = {
  label: string;
  focus: string;
  forbiddenClaims: string[];
};

export const CATEGORY_PROMPT_RULES: Record<OwnerInsightCategory, CategoryPromptRule> = {
  overview: {
    label: "overview business health",
    focus:
      "executive metrics, revenue, order quality, completion, cancellation, payment mix, and business health signals",
    forbiddenClaims: [
      "Do not say there is no revenue unless metrics.totalRevenue.value is exactly 0.",
      "Use metrics.totalRevenue.value as the only source of truth for revenue.",
      "Do not use the word today unless the selected period contains exactly one date.",
      "Do not mention products, categories, or staff because Overview does not include those dimensions.",
    ],
  },
  sales: {
    label: "sales performance",
    focus:
      "net profit estimate, revenue, discounts, food cost, operating expenses, tax collected, payment mix, menu margins, top menus, and weak menus",
    forbiddenClaims: [
      "Do not claim a product sold yesterday or today. Use selected period and comparison period wording only.",
      "Do not mention product quantities unless they appear in charts.topMenus, tables.weakMenus, or tables.menuMargins.",
      "For weak menus, use comparisonQuantity and selectedPeriodQuantity exactly as provided.",
      "Only discuss Food Cost, COGS, gross profit, margin, or Net Profit Estimate from the financial metrics or tables.menuMargins.",
    ],
  },
  rewards: {
    label: "customer performance and loyalty strategy",
    focus:
      "member share, guest share, repeat customer rate, member AOV, guest AOV, reward usage, discount cost, and discount ratio",
    forbiddenClaims: [
      "Do not mention customer names because the snapshot only contains aggregate customer metrics.",
      "Do not recommend heavier discounts unless discountCost and rewardUsageRate justify it.",
      "Do not claim retention improved or declined unless repeatCustomerRate or comparison metrics support it.",
      "Do not discuss campaign performance because campaign attribution is not included.",
    ],
  },
  inventory: {
    label: "inventory risk",
    focus:
      "critical stock, restock cost, inventory data quality, stock movement value, highest usage item, and expiry tracking readiness",
    forbiddenClaims: [
      "Do not claim any item is expired because expiry date data is not available.",
      "Do not recommend FIFO or FEFO as an active alert; only recommend adding batch and expiry fields first.",
      "Do not compare mixed inventory units by quantity when all items are selected; use Rupiah stock movement value instead.",
      "Do not mention supplier performance because supplier data is not included.",
    ],
  },
  staff: {
    label: "staff performance",
    focus:
      "active non-owner staff, attendance, late count, overtime, order attribution, productivity, service-time samples, and radar scores",
    forbiddenClaims: [
      "Do not treat owner role as staff because owner rows are excluded.",
      "Do not infer payroll cost because wage data is not included.",
      "Do not claim service is slow when serviceSampleSize is 0 or averageServiceMinutes is null.",
      "Do not blame individual staff from aggregate metrics alone.",
    ],
  },
  operations: {
    label: "operations flow",
    focus:
      "order flow stages, active backlog, completion rate, unpaid orders, partially served orders, order density, fulfillment mix, and service-time timestamp coverage",
    forbiddenClaims: [
      "Do not discuss service time when serviceSampleSize is 0 or averageServiceMinutes is null.",
      "Do not treat served as the only completed state; completed and served can both represent finished order flow.",
      "Do not infer customer satisfaction because customer feedback data is not included.",
      "Do not infer staff performance here because staff-specific data belongs to the Staff tab.",
    ],
  },
};
