import type { SupabaseClient } from "@supabase/supabase-js";
import { loadBookkeepingDashboardDataFromClient } from "@/lib/services/bookkeeping/bookkeepingService";
import { buildMetric, toNumber } from "./metricSnapshotBuilder";
import {
  buildRecommendationPeriodContext,
  isDateInPeriod,
} from "./periodService";
import {
  applyInsightOrderCorrections,
  type InsightOrderCorrectionRow,
} from "./orderCorrectionUtils";
import type {
  OwnerInsightPeriod,
  RecommendationAllowedIssue,
  RecommendationMetric,
  RecommendationSnapshot,
} from "./recommendationSnapshotTypes";

type SalesOrderRow = {
  id: string;
  total?: number | string | null;
  status?: string | null;
  payment_status?: string | null;
  payment_method?: string | null;
  order_date?: string | null;
  order_time?: string | null;
  created_at?: string | null;
};

type SalesOrderItemRow = {
  order_id?: string | null;
  product_id?: string | null;
  product_name?: string | null;
  quantity?: number | string | null;
  total_price?: number | string | null;
};

type SalesProductRow = {
  id: string;
  name?: string | null;
  category_id?: string | null;
  category?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

type SalesCategoryRow = {
  id: string;
  name?: string | null;
};

const cancelledStatuses = new Set(["cancelled", "canceled", "void", "refunded"]);
const invalidPaymentStatuses = new Set([
  "cancelled",
  "canceled",
  "failed",
  "refunded",
  "void",
  "unpaid",
  "pending",
]);

const getJakartaDateParts = (value: string | null | undefined) => {
  if (!value) return null;

  const normalizedValue = /(?:z|[+-]\d{2}:?\d{2})$/i.test(value)
    ? value
    : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const getPart = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${getPart("year")}-${getPart("month")}-${getPart("day")}`,
  };
};

const getOrderBusinessDate = (order: SalesOrderRow) =>
  getJakartaDateParts(order.created_at)?.date || String(order.order_date ?? "");

const isValidSalesOrder = (order: SalesOrderRow) => {
  const status = String(order.status ?? "").toLowerCase();
  const payment = String(order.payment_status ?? "").toLowerCase();

  if (cancelledStatuses.has(status)) return false;
  if (invalidPaymentStatuses.has(payment)) return false;

  return true;
};

const normalizeName = (value: string | null | undefined) =>
  String(value ?? "").trim().toLowerCase();

const getRelationObject = <T,>(relation: T | T[] | null | undefined): T | null => {
  if (!relation) return null;
  return Array.isArray(relation) ? (relation[0] ?? null) : relation;
};

const getProductCategory = (
  product: SalesProductRow | undefined,
  categoriesById: Map<string, string>,
) => {
  const relation = getRelationObject(product?.category);
  return (
    relation?.name ||
    categoriesById.get(product?.category_id ?? "") ||
    "Uncategorized"
  );
};

const formatEvidenceNumber = (value: number | string | null, unit: string) => {
  if (value === null) return "not available";
  if (typeof value === "string") return value;
  if (unit === "IDR") return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
  if (unit === "percent") return `${value.toFixed(1)}%`;
  return Math.round(value).toLocaleString("id-ID");
};

const groupBy = <T,>(items: T[], getKey: (item: T) => string) => {
  const map = new Map<string, T[]>();
  items.forEach((item) => {
    const key = getKey(item) || "Unknown";
    map.set(key, [...(map.get(key) ?? []), item]);
  });
  return map;
};

const summarizeOrders = (orders: SalesOrderRow[]) => {
  const validOrders = orders.filter(isValidSalesOrder);
  const revenue = validOrders.reduce((sum, order) => sum + toNumber(order.total), 0);

  return {
    revenue,
    orderCount: validOrders.length,
    averageOrderValue: validOrders.length ? revenue / validOrders.length : 0,
  };
};

const nullableNumber = (value: number | null | undefined) =>
  value === null || value === undefined ? null : value;

const buildMenuPerformance = ({
  orderItems,
  validOrderIds,
  products,
  categories,
}: {
  orderItems: SalesOrderItemRow[];
  validOrderIds: Set<string>;
  products: SalesProductRow[];
  categories: SalesCategoryRow[];
}) => {
  const productById = new Map(products.map((product) => [product.id, product]));
  const productByName = new Map(
    products.map((product) => [normalizeName(product.name), product]),
  );
  const categoriesById = new Map(
    categories.map((category) => [category.id, category.name || "Uncategorized"]),
  );

  return Array.from(
    groupBy(
      orderItems.filter((item) => item.order_id && validOrderIds.has(item.order_id)),
      (item) => item.product_id || normalizeName(item.product_name),
    ).entries(),
  )
    .map(([, rows]) => {
      const first = rows[0];
      const product =
        productById.get(first.product_id ?? "") ??
        productByName.get(normalizeName(first.product_name));
      const name = product?.name || first.product_name || "Unknown Menu";
      const sold = rows.reduce((sum, row) => sum + toNumber(row.quantity), 0);
      const revenue = rows.reduce((sum, row) => sum + toNumber(row.total_price), 0);

      return {
        id: product?.id ?? name,
        name,
        category: getProductCategory(product, categoriesById),
        sold,
        revenue,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
};

const buildSalesAllowedIssues = ({
  metrics,
  topMenus,
  weakMenus,
  categoryRevenue,
  missingFinancialCostData,
}: {
  metrics: Record<string, RecommendationMetric>;
  topMenus: ReturnType<typeof buildMenuPerformance>;
  weakMenus: Array<{ name: string; comparisonQuantity: number; selectedPeriodQuantity: number }>;
  categoryRevenue: Array<{ name: string; revenue: number; revenueShare: number }>;
  missingFinancialCostData: boolean;
}): RecommendationAllowedIssue[] => {
  const issues: RecommendationAllowedIssue[] = [];
  const revenue = Number(metrics.totalRevenue.value ?? 0);
  const revenuePrevious = Number(metrics.totalRevenue.previousValue ?? 0);
  const revenueChange = metrics.totalRevenue.changePct ?? 0;
  const orders = Number(metrics.totalOrders.value ?? 0);
  const ordersPrevious = Number(metrics.totalOrders.previousValue ?? 0);
  const ordersChange = metrics.totalOrders.changePct ?? 0;
  const aov = Number(metrics.averageOrderValue.value ?? 0);
  const aovPrevious = Number(metrics.averageOrderValue.previousValue ?? 0);
  const aovChange = metrics.averageOrderValue.changePct ?? 0;
  const topMenu = topMenus[0];
  const topCategory = categoryRevenue[0];
  const weakMenu = weakMenus[0];
  const netProfitEstimate = metrics.netProfitEstimate.value;
  const foodCost = metrics.foodCost.value;

  if (revenue === 0 && orders === 0) {
    issues.push({
      id: "sales-zero-activity",
      title: "No Sales Activity Recorded",
      priority: "high",
      confidence: "high",
      problem: "No valid sales activity was recorded in the selected period.",
      evidence: [
        `Total Revenue is ${formatEvidenceNumber(revenue, "IDR")}.`,
        `Total Orders is ${formatEvidenceNumber(orders, "count")}.`,
      ],
      recommendationHint:
        "Verify store operations, order entry, payment status recording, and menu availability before making commercial changes.",
      expectedImpact:
        "Separating operational recording issues from real demand loss prevents wrong business decisions.",
      metricKeys: ["totalRevenue", "totalOrders"],
    });
  }

  if (revenue > 0 && revenuePrevious > 0 && revenueChange <= -15) {
    issues.push({
      id: "sales-revenue-decline",
      title: "Sales Revenue Declined",
      priority: revenueChange <= -30 ? "high" : "medium",
      confidence: "high",
      problem: "Sales revenue is lower than the comparison period.",
      evidence: [
        `Total Revenue is ${formatEvidenceNumber(revenue, "IDR")}.`,
        `Comparison revenue was ${formatEvidenceNumber(revenuePrevious, "IDR")}.`,
        `Revenue change is ${revenueChange.toFixed(1)}%.`,
      ],
      recommendationHint:
        aovChange <= ordersChange
          ? "Prioritize menu value recovery first because AOV is the stronger revenue drag. Review bundles, add-ons, and menu mix."
          : "Prioritize order volume recovery first because fewer transactions are the stronger revenue drag. Review demand, availability, and checkout flow.",
      expectedImpact:
        "Identifying the stronger driver helps the owner choose between traffic recovery and basket-size improvement.",
      metricKeys: ["totalRevenue", "totalOrders", "averageOrderValue"],
    });
  }

  if (orders > 0 && ordersPrevious > 0 && ordersChange <= -15) {
    issues.push({
      id: "sales-order-volume-decline",
      title: "Sales Order Volume Declined",
      priority: ordersChange <= -30 ? "high" : "medium",
      confidence: "high",
      problem: "Valid sales orders are lower than the comparison period.",
      evidence: [
        `Total Orders is ${formatEvidenceNumber(orders, "count")}.`,
        `Comparison orders were ${formatEvidenceNumber(ordersPrevious, "count")}.`,
        `Order change is ${ordersChange.toFixed(1)}%.`,
      ],
      recommendationHint:
        "Check operating hours, stock/menu availability, and payment friction before increasing promotion spend.",
      expectedImpact:
        "Recovering transaction volume can lift revenue without relying only on discounts.",
      metricKeys: ["totalOrders", "totalRevenue"],
    });
  }

  if (aov > 0 && aovPrevious > 0 && aovChange <= -10) {
    issues.push({
      id: "sales-aov-decline",
      title: "Average Order Value Declined",
      priority: "medium",
      confidence: "high",
      problem: "Average transaction value is weaker than the comparison period.",
      evidence: [
        `Average Order Value is ${formatEvidenceNumber(aov, "IDR")}.`,
        `Comparison AOV was ${formatEvidenceNumber(aovPrevious, "IDR")}.`,
        `AOV change is ${aovChange.toFixed(1)}%.`,
      ],
      recommendationHint:
        "Review bundles, add-ons, premium menu visibility, and cashier prompts to increase basket size.",
      expectedImpact:
        "Lifting AOV improves revenue even if order volume has not fully recovered.",
      metricKeys: ["averageOrderValue", "totalRevenue"],
    });
  }

  if (missingFinancialCostData) {
    issues.push({
      id: "sales-food-cost-data-needed",
      title: "Food Cost Data Needs Completion",
      priority: "medium",
      confidence: "high",
      problem:
        "Net Profit Estimate cannot be trusted until Food Cost/COGS data is complete.",
      evidence: [
        `Food Cost is ${formatEvidenceNumber(foodCost as number | null, "IDR")}.`,
        `Net Profit Estimate is ${formatEvidenceNumber(netProfitEstimate as number | null, "IDR")}.`,
      ],
      recommendationHint:
        "Complete menu recipes and inventory item costs first, then regenerate the sales recommendation before making margin decisions.",
      expectedImpact:
        "Reliable COGS prevents the owner from optimizing sales using incomplete profit data.",
      metricKeys: ["foodCost", "netProfitEstimate"],
    });
  }

  if (weakMenu) {
    issues.push({
      id: "sales-weak-menu",
      title: "Previously Selling Menu Lost Momentum",
      priority: "medium",
      confidence: "high",
      problem: "A menu item sold in the comparison period but has weaker selected-period movement.",
      evidence: [
        `${weakMenu.name} sold ${formatEvidenceNumber(weakMenu.selectedPeriodQuantity, "count")} in the selected period.`,
        `${weakMenu.name} sold ${formatEvidenceNumber(weakMenu.comparisonQuantity, "count")} in the comparison period.`,
      ],
      recommendationHint:
        "Check whether this menu item is available, visible, correctly priced, and still attractive in the current menu mix.",
      expectedImpact:
        "Recovering a proven menu item can improve sales without creating a new campaign from scratch.",
      metricKeys: ["weakMenus"],
    });
  }

  if (topMenu && revenue > 0) {
    issues.push({
      id: "sales-top-menu-leverage",
      title: "Top Menu Can Be Used More Deliberately",
      priority: "low",
      confidence: "medium",
      problem: "The top selling menu is a useful anchor for sales strategy.",
      evidence: [
        `${topMenu.name} sold ${formatEvidenceNumber(topMenu.sold, "count")}.`,
        `${topMenu.name} generated ${formatEvidenceNumber(topMenu.revenue, "IDR")}.`,
      ],
      recommendationHint:
        "Use the top menu as a bundle anchor or add-on trigger instead of discounting the whole menu.",
      expectedImpact:
        "A targeted bundle can raise AOV while protecting margin better than broad discounts.",
      metricKeys: ["topMenus", "averageOrderValue"],
    });
  }

  if (topCategory && topCategory.revenueShare >= 60) {
    issues.push({
      id: "sales-category-concentration",
      title: "Revenue Is Concentrated In One Category",
      priority: "medium",
      confidence: "high",
      problem: "One category contributes a large share of sales revenue.",
      evidence: [
        `${topCategory.name} generated ${formatEvidenceNumber(topCategory.revenue, "IDR")}.`,
        `${topCategory.name} contributes ${topCategory.revenueShare.toFixed(1)}% of category revenue.`,
      ],
      recommendationHint:
        "Use the dominant category as the traffic anchor while testing attach-rate offers from weaker categories.",
      expectedImpact:
        "Balancing category contribution reduces dependency risk and can improve basket size.",
      metricKeys: ["categoryRevenue"],
    });
  }

  if (issues.length === 0) {
    issues.push({
      id: "sales-monitor-baseline",
      title: "Sales Metrics Are Stable",
      priority: "low",
      confidence: "medium",
      problem: "No critical sales issue was detected from selected-period metrics.",
      evidence: [
        `Total Revenue is ${formatEvidenceNumber(revenue, "IDR")}.`,
        `Total Orders is ${formatEvidenceNumber(orders, "count")}.`,
        `Average Order Value is ${formatEvidenceNumber(aov, "IDR")}.`,
      ],
      recommendationHint:
        "Monitor revenue, order volume, AOV, top menu, and category contribution before changing commercial strategy.",
      expectedImpact:
        "Keeping a stable baseline helps the owner make changes only when a real sales signal appears.",
      metricKeys: ["totalRevenue", "totalOrders", "averageOrderValue"],
    });
  }

  return issues.slice(0, 5);
};

export async function buildSalesRecommendationSnapshot(
  supabase: SupabaseClient,
  insightPeriod?: OwnerInsightPeriod,
): Promise<RecommendationSnapshot> {
  const period = buildRecommendationPeriodContext(insightPeriod);
  const [
    ordersResult,
    orderItemsResult,
    productRelationResult,
    categoriesResult,
    orderCorrectionsResult,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id,total,status,payment_status,payment_method,order_date,order_time,created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("order_items")
      .select("order_id,product_id,product_name,quantity,total_price"),
    supabase
      .from("products")
      .select("id,name,category_id,category:categories(name)")
      .order("name", { ascending: true }),
    supabase.from("categories").select("id,name"),
    supabase.from("order_corrections").select("id,order_id,status,physical_status,note"),
  ]);
  const productFallbackResult = productRelationResult.error
    ? await supabase
        .from("products")
        .select("id,name,category_id")
        .order("name", { ascending: true })
    : productRelationResult;

  if (ordersResult.error) {
    throw new Error(`Owner AI could not read sales orders: ${ordersResult.error.message}`);
  }

  if (orderItemsResult.error) {
    throw new Error(`Owner AI could not read sales order items: ${orderItemsResult.error.message}`);
  }

  if (orderCorrectionsResult.error) {
    throw new Error(
      `Owner AI could not read sales order corrections: ${orderCorrectionsResult.error.message}`,
    );
  }

  const orders = applyInsightOrderCorrections(
    (ordersResult.data ?? []) as SalesOrderRow[],
    (orderCorrectionsResult.data ?? []) as InsightOrderCorrectionRow[],
  );
  const orderItems = (orderItemsResult.data ?? []) as SalesOrderItemRow[];
  const products = (productFallbackResult.data ?? []) as SalesProductRow[];
  const categories = (categoriesResult.data ?? []) as SalesCategoryRow[];

  if (orders.length === 0) {
    throw new Error(
      "Owner AI server-side sales query returned 0 order rows. Verify SUPABASE_SERVICE_ROLE_KEY is available to the API runtime.",
    );
  }

  const selectedOrders = orders.filter((order) =>
    isDateInPeriod(getOrderBusinessDate(order), period.selected),
  );
  const comparisonOrders = orders.filter((order) =>
    isDateInPeriod(getOrderBusinessDate(order), period.comparison),
  );
  const selectedValidOrders = selectedOrders.filter(isValidSalesOrder);
  const comparisonValidOrders = comparisonOrders.filter(isValidSalesOrder);
  const selectedSummary = summarizeOrders(selectedOrders);
  const comparisonSummary = summarizeOrders(comparisonOrders);
  const bookkeepingData = await loadBookkeepingDashboardDataFromClient(supabase, {
    startDate: period.selected.startDate,
    endDate: period.selected.endDate,
  });
  const selectedOrderIds = new Set(selectedValidOrders.map((order) => order.id));
  const comparisonOrderIds = new Set(comparisonValidOrders.map((order) => order.id));
  const selectedMenus = buildMenuPerformance({
    orderItems,
    validOrderIds: selectedOrderIds,
    products,
    categories,
  });
  const comparisonMenus = buildMenuPerformance({
    orderItems,
    validOrderIds: comparisonOrderIds,
    products,
    categories,
  });
  const selectedByName = new Map(selectedMenus.map((menu) => [menu.name, menu]));
  const weakMenus = comparisonMenus
    .map((menu) => ({
      name: menu.name,
      comparisonQuantity: menu.sold,
      selectedPeriodQuantity: selectedByName.get(menu.name)?.sold ?? 0,
    }))
    .filter((menu) => menu.comparisonQuantity > menu.selectedPeriodQuantity)
    .sort((a, b) => b.comparisonQuantity - a.comparisonQuantity)
    .slice(0, 5);
  const categoryRevenue = Array.from(
    groupBy(selectedMenus, (menu) => menu.category).entries(),
  )
    .map(([name, rows]) => {
      const revenue = rows.reduce((sum, row) => sum + row.revenue, 0);
      return {
        name,
        revenue,
        revenueShare: selectedSummary.revenue
          ? (revenue / selectedSummary.revenue) * 100
          : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
  const metrics = {
    netProfitEstimate: buildMetric({
      value: nullableNumber(bookkeepingData.summary.netProfitEstimate),
      unit: "IDR",
      source: "bookkeeping summary: revenue minus discounts, food cost, and operating expenses",
      displayLabel: "Net Profit Estimate",
    }),
    totalRevenue: buildMetric({
      value: bookkeepingData.summary.grossSales,
      previousValue: comparisonSummary.revenue,
      unit: "IDR",
      source: "bookkeeping summary grossSales, matching Sales dashboard Revenue card",
      displayLabel: "Revenue",
    }),
    discounts: buildMetric({
      value: bookkeepingData.summary.discounts,
      unit: "IDR",
      source: "bookkeeping summary discounts",
      displayLabel: "Discounts",
    }),
    foodCost: buildMetric({
      value: nullableNumber(bookkeepingData.summary.estimatedCogs),
      unit: "IDR",
      source: "bookkeeping menu margin COGS, matching Sales dashboard Food Cost card",
      displayLabel: "Food Cost",
    }),
    operatingExpenses: buildMetric({
      value: bookkeepingData.summary.operatingExpenses,
      unit: "IDR",
      source: "bookkeeping expenses in the selected period",
      displayLabel: "Operating Expenses",
    }),
    taxCollected: buildMetric({
      value: bookkeepingData.summary.taxCollected,
      unit: "IDR",
      source: "bookkeeping summary taxCollected",
      displayLabel: "Tax Collected",
    }),
    totalOrders: buildMetric({
      value: bookkeepingData.summary.totalOrders,
      previousValue: comparisonSummary.orderCount,
      unit: "count",
      source: "bookkeeping summary totalOrders",
      displayLabel: "Total Orders",
    }),
    averageOrderValue: buildMetric({
      value: selectedSummary.averageOrderValue,
      previousValue: comparisonSummary.averageOrderValue,
      unit: "IDR",
      source: "totalRevenue divided by totalOrders",
      displayLabel: "Average Order Value",
    }),
    activeMenusSold: buildMetric({
      value: selectedMenus.length,
      previousValue: comparisonMenus.length,
      unit: "count",
      source: "unique menu items sold in order_items",
      displayLabel: "Menus Sold",
    }),
  } satisfies Record<string, RecommendationMetric>;

  return {
    category: "sales",
    period,
    metrics,
    charts: {
      topMenus: {
        title: "Top Selling Menu",
        description: "Best selling items by quantity and revenue.",
        points: selectedMenus.slice(0, 6).map((menu) => ({
          name: menu.name,
          sold: menu.sold,
          revenue: menu.revenue,
          category: menu.category,
        })),
      },
      categoryRevenue: {
        title: "Revenue by Category",
        description: "Menu revenue grouped by manager menu categories.",
        points: categoryRevenue.map((category) => ({
          name: category.name,
          revenue: category.revenue,
          revenueShare: category.revenueShare,
        })),
      },
    },
    tables: {
      paymentBreakdown: {
        title: "Payment Method Breakdown",
        description: "Payment split from valid paid orders, including total row.",
        rows: [
          ...bookkeepingData.paymentBreakdown,
          {
            method: "Total",
            orders: bookkeepingData.summary.totalOrders,
            amount: bookkeepingData.paymentBreakdown.reduce(
              (sum, row) => sum + row.amount,
              0,
            ),
          },
        ],
      },
      menuMargins: {
        title: "Profitability Table",
        description:
          "Menu profitability rows using the same bookkeeping COGS source as Food Cost.",
        rows: bookkeepingData.menuMargins.slice(0, 10).map((row) => ({
          menuName: row.menuName,
          quantitySold: row.quantitySold,
          revenue: row.revenue,
          foodCost: row.estimatedCogs,
          grossProfit: row.grossProfit,
          marginPct: row.marginPct,
          status: row.status,
        })),
      },
      weakMenus: {
        title: "Weak Menus",
        description:
          "Menus with lower selected-period quantity than the comparison period.",
        rows: weakMenus,
      },
    },
    allowedIssues: buildSalesAllowedIssues({
      metrics,
      topMenus: selectedMenus,
      weakMenus,
      categoryRevenue,
      missingFinancialCostData:
        bookkeepingData.summary.estimatedCogs === null ||
        bookkeepingData.summary.netProfitEstimate === null ||
        bookkeepingData.menuMargins.some((row) => row.status !== "ready"),
    }),
    dataQuality: {
      missingFields: [],
      unsupportedClaims: [
        "Only mention margin, gross profit, Food Cost, COGS, or Net Profit Estimate using tables.menuMargins or the financial metrics in this snapshot.",
        "Do not mention products that are not listed in charts.topMenus or tables.weakMenus.",
        "Do not claim today/yesterday unless the period labels are single-day labels.",
      ],
      warnings: productRelationResult.error?.message
        ? ["Product category relation was unavailable; category fallback may be limited."]
        : [],
    },
    diagnostics: {
      fetchedOrderRows: orders.length,
      selectedOrderRows: selectedOrders.length,
      comparisonOrderRows: comparisonOrders.length,
      selectedMenuRows: selectedMenus.length,
    },
  };
}
