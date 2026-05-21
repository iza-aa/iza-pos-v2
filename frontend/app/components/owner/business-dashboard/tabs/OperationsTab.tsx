"use client";

import LiveActivity from "@/app/components/owner/dashboard/analytics/liveactivity";
import PaymentMethod from "@/app/components/owner/dashboard/analytics/paymentmethod";
import PeakPerformance from "@/app/components/owner/dashboard/analytics/peakperformance";
import GenerateRecommendationPanel from "../ai/GenerateRecommendationPanel";

export default function OperationsTab() {
  return (
    <div className="space-y-4">
      <GenerateRecommendationPanel category="operations" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <LiveActivity />
        </div>
        <PaymentMethod />
      </div>
      <PeakPerformance />
    </div>
  );
}
