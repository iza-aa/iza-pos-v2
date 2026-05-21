"use client";

import LowStockAlert from "@/app/components/owner/dashboard/analytics/lowstockalert";
import GenerateRecommendationPanel from "../ai/GenerateRecommendationPanel";

export default function InventoryTab() {
  return (
    <div className="space-y-4">
      <GenerateRecommendationPanel category="inventory" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <LowStockAlert />
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-900">Inventory Signals</h2>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            AI snapshot uses product stock, product availability, raw material stock,
            and reorder levels. Detailed inventory controls remain in manager inventory.
          </p>
        </section>
      </div>
    </div>
  );
}
