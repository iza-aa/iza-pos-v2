import type { Language } from "./types";

type LabelEntry = Record<Language, string>;
type LabelMap = Record<string, LabelEntry>;

export const domainLabels = {
  reportType: {
    low_stock: { en: "Low Stock", id: "Stok Menipis" },
    out_of_stock: { en: "Out of Stock", id: "Stok Habis" },
    waste: { en: "Waste", id: "Waste" },
    waste_damaged: { en: "Waste/Damaged", id: "Waste/Rusak" },
    damaged: { en: "Damaged", id: "Rusak" },
    expired: { en: "Expired", id: "Kedaluwarsa" },
    restock_request: { en: "Restock Request", id: "Permintaan Restock" },
    kitchen_note: { en: "Kitchen Note", id: "Catatan Dapur" },
    stock_check: { en: "Stock Check", id: "Cek Stok" },
    testing_usage: { en: "Testing Usage", id: "Pemakaian Tes" },
    test_food: { en: "Food Test", id: "Tes Makanan" },
    test_drink: { en: "Drink Test", id: "Tes Minuman" },
    test_ingredient: { en: "Ingredient Test", id: "Tes Bahan" },
  },
  station: {
    kitchen: { en: "Kitchen", id: "Dapur" },
    barista: { en: "Bar", id: "Bar" },
    shared: { en: "Shared", id: "Bersama" },
  },
  trackingMode: {
    direct_auto_deduct: { en: "POS deduct", id: "Potong POS" },
    kitchen_station_auto_deduct: { en: "Kitchen deduct", id: "Potong Dapur" },
    bulk_usage_expense: { en: "Opened ingredient", id: "Bahan dibuka" },
  },
} satisfies Record<string, LabelMap>;

const labelGroups: Record<keyof typeof domainLabels, LabelMap> = domainLabels;

export const getDomainLabel = (
  group: keyof typeof domainLabels,
  value: string | null | undefined,
  language: Language,
) => {
  if (!value) return "-";
  return labelGroups[group][value]?.[language] || value;
};
