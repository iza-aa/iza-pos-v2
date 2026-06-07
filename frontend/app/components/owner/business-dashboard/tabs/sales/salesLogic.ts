import { OWNER_CHART_SERIES } from "@/lib/constants/theme";
import { convertQuantity } from "@/lib/utils/unitConversion";
import type {
  InventoryItemRow,
  ProductCategoryRelation,
  ProductRow,
  RecipeIngredientRow,
  RecipeRow,
} from "../shared/dashboardTypes";
import type { DateRangeValue } from "../DateRangeFilter";
import {
  getOrderBusinessDate,
  groupBy,
  isValidSalesOrder,
  toNumber,
} from "../shared/dashboardUtils";
import type { SalesDashboardData } from "./useSalesDashboardData";

const getRelationObject = <T,>(relation: T | T[] | null | undefined): T | null => {
  if (!relation) return null;
  return Array.isArray(relation) ? (relation[0] ?? null) : relation;
};

function normalizeName(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function getProductCategory(
  product: ProductRow | undefined,
  categoriesById: Map<string, string>,
) {
  const category = getRelationObject<ProductCategoryRelation>(product?.category);
  return (
    category?.name ||
    categoriesById.get(product?.category_id ?? "") ||
    "Uncategorized"
  );
}

function getRecipeCostingMode(ingredient: RecipeIngredientRow) {
  return ingredient.costing_mode || "deduct_from_pos";
}

function getRecipeCost(
  product: ProductRow | undefined,
  recipes: RecipeRow[],
  ingredients: RecipeIngredientRow[],
  inventoryItems: InventoryItemRow[],
) {
  if (!product) return null;

  const recipe =
    recipes.find((item) => item.product_id === product.id) ??
    recipes.find((item) => normalizeName(item.product_name) === normalizeName(product.name));

  if (!recipe) return null;

  const recipeIngredients = ingredients.filter((item) => item.recipe_id === recipe.id);
  if (!recipeIngredients.length) return null;

  let hasCostData = false;
  const cost = recipeIngredients.reduce((sum, ingredient) => {
    if (getRecipeCostingMode(ingredient) === "kitchen_overhead") return sum;

    const inventory = inventoryItems.find(
      (item) => item.id === ingredient.inventory_item_id,
    );
    const unitCost = toNumber(inventory?.cost_per_unit ?? inventory?.price_per_unit);

    if (unitCost > 0) {
      hasCostData = true;
    }

    const quantityInInventoryUnit = convertQuantity(
      toNumber(ingredient.quantity_needed),
      ingredient.unit,
      inventory?.unit,
    );

    return sum + quantityInInventoryUnit * unitCost;
  }, 0);

  return hasCostData ? cost : null;
}

function getStatus({
  sold,
  revenue,
  estimatedCost,
  margin,
}: {
  sold: number;
  revenue: number;
  estimatedCost: number | null;
  margin: number | null;
}) {
  if (revenue <= 0 || sold <= 0) return "No Sales";
  if (estimatedCost === null || margin === null) return "Needs Cost Data";
  if (sold >= 10 && margin >= 60) return "Star Menu";
  if (margin < 30) return "Low Margin";
  if (sold < 3) return "Low Demand";
  return "Healthy";
}

export function buildSalesPerformance(data: SalesDashboardData, range: DateRangeValue) {
  const validOrderIds = new Set(
    data.orders
      .filter(isValidSalesOrder)
      .filter(
        (order) =>
          getOrderBusinessDate(order) >= range.startDate &&
          getOrderBusinessDate(order) <= range.endDate,
      )
      .map((order) => order.id),
  );
  const productById = new Map(data.products.map((product) => [product.id, product]));
  const productByName = new Map(
    data.products.map((product) => [normalizeName(product.name), product]),
  );
  const categoriesById = new Map(
    data.categories.map((category) => [category.id, category.name || "Uncategorized"]),
  );

  return Array.from(
    groupBy(
      data.orderItems.filter((item) => item.order_id && validOrderIds.has(item.order_id)),
      (item) => item.product_id || normalizeName(item.product_name) || "unknown",
    ).entries(),
  )
    .map(([, rows]) => {
      const firstRow = rows[0];
      const product =
        productById.get(firstRow.product_id ?? "") ??
        productByName.get(normalizeName(firstRow.product_name));
      const name = product?.name || firstRow.product_name || "Unknown Menu";
      const sold = rows.reduce((sum, row) => sum + toNumber(row.quantity), 0);
      const revenue = rows.reduce((sum, row) => sum + toNumber(row.total_price), 0);
      const recipeCost = getRecipeCost(
        product,
        data.recipes,
        data.recipeIngredients,
        data.inventoryItems,
      );
      const estimatedCost = recipeCost === null ? null : recipeCost * sold;
      const grossProfit = estimatedCost === null ? null : revenue - estimatedCost;
      const margin =
        grossProfit === null || revenue <= 0 ? null : (grossProfit / revenue) * 100;

      return {
        id: product?.id ?? name,
        name,
        category: getProductCategory(product, categoriesById),
        sold,
        revenue,
        estimatedCost,
        grossProfit,
        margin,
        status: getStatus({ sold, revenue, estimatedCost, margin }),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export function buildCategoryRevenue(items: ReturnType<typeof buildSalesPerformance>) {
  return Array.from(groupBy(items, (item) => item.category).entries())
    .map(([name, rows], index) => ({
      name,
      revenue: rows.reduce((sum, row) => sum + row.revenue, 0),
      fill: OWNER_CHART_SERIES[index % OWNER_CHART_SERIES.length],
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export function buildTopSellingMenus(items: ReturnType<typeof buildSalesPerformance>) {
  return items
    .slice()
    .sort((a, b) => b.sold - a.sold || b.revenue - a.revenue)
    .slice(0, 6)
    .map((item, index) => ({
      ...item,
      fill: OWNER_CHART_SERIES[index % OWNER_CHART_SERIES.length],
    }));
}

export function getQuadrantData(items: ReturnType<typeof buildSalesPerformance>) {
  return items
    .filter((item) => item.sold > 0 || item.revenue > 0)
    .map((item) => ({
      ...item,
      quadrantValue: item.revenue,
    }));
}
