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
  serviceCharge: number;
  tax: number;
  total: number;
};

type OrderFinancialOptions = {
  orderType?: string | null;
};

const roundMoney = (value: number) => Math.round(value);

const isDineInOrder = (orderType?: string | null) => {
  return (orderType ?? "").trim().toLowerCase().replace(/[-_]/g, " ").includes("dine");
};

export function calculateOrderFinancialTotals(
  rawSubtotal: number,
  settings: BookkeepingFinancialSettings = defaultFinancialSettings,
  options: OrderFinancialOptions = {},
): OrderFinancialTotals {
  const subtotal = Math.max(Number(rawSubtotal) || 0, 0);
  const taxRate = settings.taxEnabled ? Math.max(Number(settings.taxRate) || 0, 0) / 100 : 0;
  const serviceChargeRate =
    settings.serviceChargeEnabled && isDineInOrder(options.orderType)
      ? Math.max(Number(settings.serviceChargeRate) || 0, 0) / 100
      : 0;
  const serviceCharge = roundMoney(subtotal * serviceChargeRate);

  if (taxRate <= 0) {
    return {
      subtotal: roundMoney(subtotal),
      serviceCharge,
      tax: 0,
      total: roundMoney(subtotal + serviceCharge),
    };
  }

  if (settings.pricesIncludeTax) {
    const preTaxSubtotal = roundMoney(subtotal / (1 + taxRate));
    const tax = roundMoney(subtotal - preTaxSubtotal);

    return {
      subtotal: preTaxSubtotal,
      serviceCharge,
      tax,
      total: roundMoney(subtotal + serviceCharge),
    };
  }

  const tax = roundMoney(subtotal * taxRate);

  return {
    subtotal: roundMoney(subtotal),
    serviceCharge,
    tax,
    total: roundMoney(subtotal + serviceCharge + tax),
  };
}
