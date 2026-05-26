import type { BookkeepingFinancialSettings } from "./bookkeepingTypes";

export const defaultFinancialSettings: BookkeepingFinancialSettings = {
  taxEnabled: false,
  taxLabel: "PPN",
  taxRate: 0,
  serviceChargeEnabled: false,
  serviceChargeRate: 0,
  pricesIncludeTax: false,
  updatedAt: null,
  updatedBy: null,
};

export type OrderFinancialTotals = {
  subtotal: number;
  tax: number;
  total: number;
};

const roundMoney = (value: number) => Math.round(value);

export function calculateOrderFinancialTotals(
  rawSubtotal: number,
  settings: BookkeepingFinancialSettings = defaultFinancialSettings,
): OrderFinancialTotals {
  const subtotal = Math.max(Number(rawSubtotal) || 0, 0);
  const taxRate = settings.taxEnabled ? Math.max(Number(settings.taxRate) || 0, 0) / 100 : 0;

  if (taxRate <= 0) {
    return {
      subtotal: roundMoney(subtotal),
      tax: 0,
      total: roundMoney(subtotal),
    };
  }

  if (settings.pricesIncludeTax) {
    const preTaxSubtotal = roundMoney(subtotal / (1 + taxRate));
    const tax = roundMoney(subtotal - preTaxSubtotal);

    return {
      subtotal: preTaxSubtotal,
      tax,
      total: roundMoney(subtotal),
    };
  }

  const tax = roundMoney(subtotal * taxRate);

  return {
    subtotal: roundMoney(subtotal),
    tax,
    total: roundMoney(subtotal + tax),
  };
}
