const UNIT_ALIASES: Record<string, string> = {
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  g: "g",
  gr: "g",
  gram: "g",
  grams: "g",
  l: "L",
  liter: "L",
  liters: "L",
  litre: "L",
  litres: "L",
  ml: "mL",
  milliliter: "mL",
  milliliters: "mL",
  millilitre: "mL",
  millilitres: "mL",
  pcs: "pcs",
  pc: "pcs",
  piece: "pcs",
  pieces: "pcs",
  pack: "pack",
  packs: "pack",
  box: "box",
  boxes: "box",
};

const UNIT_TO_BASE: Record<string, { family: string; factor: number }> = {
  kg: { family: "mass", factor: 1000 },
  g: { family: "mass", factor: 1 },
  L: { family: "volume", factor: 1000 },
  mL: { family: "volume", factor: 1 },
  pcs: { family: "count", factor: 1 },
  pack: { family: "pack", factor: 1 },
  box: { family: "box", factor: 1 },
};

export const normalizeUnit = (unit?: string | null) => {
  const key = String(unit || "").trim().toLowerCase();
  return UNIT_ALIASES[key] || String(unit || "").trim();
};

export const getCompatibleUnits = (unit?: string | null) => {
  const normalized = normalizeUnit(unit);
  const family = UNIT_TO_BASE[normalized]?.family;

  if (family === "mass") return ["kg", "g"];
  if (family === "volume") return ["L", "mL"];
  if (family === "count") return ["pcs"];
  if (family === "pack") return ["pack"];
  if (family === "box") return ["box"];

  return normalized ? [normalized] : [];
};

export const canConvertUnit = (fromUnit?: string | null, toUnit?: string | null) => {
  const from = UNIT_TO_BASE[normalizeUnit(fromUnit)];
  const to = UNIT_TO_BASE[normalizeUnit(toUnit)];
  return Boolean(from && to && from.family === to.family);
};

export const convertQuantity = (
  quantity: number,
  fromUnit?: string | null,
  toUnit?: string | null,
) => {
  const normalizedFrom = normalizeUnit(fromUnit);
  const normalizedTo = normalizeUnit(toUnit);

  if (!normalizedFrom || !normalizedTo || normalizedFrom === normalizedTo) {
    return quantity;
  }

  const from = UNIT_TO_BASE[normalizedFrom];
  const to = UNIT_TO_BASE[normalizedTo];

  if (!from || !to || from.family !== to.family) {
    return quantity;
  }

  return (quantity * from.factor) / to.factor;
};
