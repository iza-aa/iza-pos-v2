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
      "selected-period revenue, order count, average order value, top products, weak products, payment mix, and peak hours",
    forbiddenClaims: [
      "Do not claim a product sold yesterday or today. Use selected period and comparison period wording only.",
      "Do not mention product quantities unless they appear in topProducts or weakProducts.",
      "For weakProducts, use comparisonQuantity and selectedPeriodQuantity exactly as provided.",
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
      "low stock products, low stock raw materials, unavailable products, out-of-stock materials, and restock urgency",
    forbiddenClaims: [
      "Do not discuss expiry, FIFO, FEFO, waste, or spoilage unless expiry or batch data exists in the snapshot.",
      "Do not mention stock movement trends unless movement data exists in the snapshot.",
    ],
  },
  staff: {
    label: "staff performance",
    focus:
      "active staff, attendance, clock-in records, late count, overtime, order attribution, and service-time sample size",
    forbiddenClaims: [
      "Do not blame individual staff unless the snapshot contains individual staff names and metrics.",
      "Do not claim service is slow when serviceSampleSize is 0 or averageServiceMinutes is null.",
    ],
  },
  operations: {
    label: "operations flow",
    focus:
      "order status distribution, payment status, fulfillment method, unpaid orders, active orders, and completed orders",
    forbiddenClaims: [
      "Do not discuss service time unless timestamp duration data exists in the snapshot.",
      "Do not treat served as the only completed state; completed and served can both represent finished order flow.",
    ],
  },
};
