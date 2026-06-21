import type { OwnerInsightCategory } from "../domain/insightSchema";

export type CategoryPromptRule = {
  label: string;
  focus: string;
  forbiddenClaims: string[];
};

export const CATEGORY_PROMPT_RULES: Record<OwnerInsightCategory, CategoryPromptRule> = {
  overview: {
    label: "overview business health",
    focus:
      "executive signals across Sales, Customer, Inventory, Staff, and Operations, highlighting the most important cross-area action for the owner",
    forbiddenClaims: [
      "Treat Overview as a five-area executive summary, not as another Sales analysis.",
      "Use metrics.salesNetSales as the source of truth for sales value.",
      "Use only the Customer, Inventory, Staff, and Operations metrics included in the snapshot.",
      "Do not use the word today unless the selected period contains exactly one date.",
      "Do not invent product names, staff names, stock items, or operational causes that are not included in the supporting area issue.",
    ],
  },
  sales: {
    label: "sales performance",
    focus:
      "Net Sales, valid paid orders, Average Order Value, estimated profit, payment mix, menu sales, category contribution, and menu profitability",
    forbiddenClaims: [
      "Do not claim a product sold yesterday or today. Use selected period and comparison period wording only.",
      "Do not mention product quantities unless they appear in charts.topMenus, tables.weakMenus, or tables.menuMargins.",
      "For weak menus, use comparisonQuantity and selectedPeriodQuantity exactly as provided.",
      "Only discuss Food Cost, COGS, gross profit, margin, or Net Profit Estimate from the financial metrics or tables.menuMargins.",
      "Do not suggest specific bundle pairings or example menu items unless those exact menu items appear in charts.topMenus, tables.weakMenus, or tables.menuMargins. Never invent examples such as pastry, dessert, sandwich, or snack.",
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
      "critical stock, restock cost, inventory data quality, stock movement value, highest usage item, batch expiry risk, and FEFO/FIFO readiness",
    forbiddenClaims: [
      "Only claim expiry or FEFO risk when it is supported by batchStock rows.",
      "If batchStock rows are unavailable, recommend completing batch data before making expiry claims.",
      "Do not compare mixed inventory units by quantity when all items are selected; use Rupiah stock movement value instead.",
      "Mention supplier names only as batch purchase context; do not rank supplier performance without repeated purchase evidence.",
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
  activity_log: {
    label: "activity log audit",
    focus:
      "audit trail quality, critical events, warning events, destructive actions, inventory corrections, financial changes, staff/system changes, top users, and missing change summaries",
    forbiddenClaims: [
      "Only discuss users, actions, categories, severities, and resources that appear in the activity log snapshot.",
      "Do not accuse a user of abuse or fraud; recommend verification and approval checks instead.",
      "Do not claim an action caused stock, sales, or financial loss unless the change summary or resource data supports it.",
      "Use selected period wording instead of today unless the selected period contains exactly one date.",
    ],
  },
};
