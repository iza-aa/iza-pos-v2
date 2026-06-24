export type PreparationStation = "kitchen" | "bar" | "cashier" | "none";

export type KitchenRoutingStatus = "pending" | "not_required";

export type ProductCategoryWithPreparationStation = {
  name?: string | null;
  preparation_station?: string | null;
};

export type ProductWithPreparationCategory = {
  category?: ProductCategoryWithPreparationStation | ProductCategoryWithPreparationStation[] | null;
  categories?: ProductCategoryWithPreparationStation | ProductCategoryWithPreparationStation[] | null;
};

const PREPARATION_STATION_ALIASES: Record<string, PreparationStation> = {
  kitchen: "kitchen",
  dapur: "kitchen",
  food: "kitchen",
  bar: "bar",
  barista: "bar",
  beverage: "bar",
  drink: "bar",
  cashier: "cashier",
  counter: "cashier",
  none: "none",
  no_station: "none",
  not_required: "none",
};

export const normalizePreparationStation = (
  value: unknown,
): PreparationStation | null => {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (!normalized) return null;

  return PREPARATION_STATION_ALIASES[normalized] ?? null;
};

export const getCategoryRelation = (
  category:
    | ProductCategoryWithPreparationStation
    | ProductCategoryWithPreparationStation[]
    | null
    | undefined,
) => {
  if (Array.isArray(category)) return category[0] ?? null;
  return category ?? null;
};

export const getProductPreparationStation = (
  product?: ProductWithPreparationCategory | null,
): PreparationStation => {
  const category = getCategoryRelation(product?.category ?? product?.categories);

  return normalizePreparationStation(category?.preparation_station) ?? "kitchen";
};

export const getKitchenStatusForPreparationStation = (
  station: PreparationStation,
): KitchenRoutingStatus => {
  return station === "kitchen" ? "pending" : "not_required";
};

export const shouldRouteToKitchen = (
  product?: ProductWithPreparationCategory | null,
) => getProductPreparationStation(product) === "kitchen";
