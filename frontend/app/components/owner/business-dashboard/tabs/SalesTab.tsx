"use client";

import TotalSales from "@/app/components/owner/dashboard/analytics/totalsales";
import TotalProductSales from "@/app/components/owner/dashboard/analytics/totalproductsales";
import TotalCustomer from "@/app/components/owner/dashboard/analytics/totalcustomer";
import AvgOrderValue from "@/app/components/owner/dashboard/analytics/avgordervalue";
import ReportAnalytics from "@/app/components/owner/dashboard/analytics/reportanalytics";
import FavoriteProduct from "@/app/components/owner/dashboard/analytics/favoriteproduct";
import PaymentMethod from "@/app/components/owner/dashboard/analytics/paymentmethod";
import PeakPerformance from "@/app/components/owner/dashboard/analytics/peakperformance";
import LiveActivity from "@/app/components/owner/dashboard/analytics/liveactivity";
import GenerateRecommendationPanel from "../ai/GenerateRecommendationPanel";

export default function SalesTab() {
  return (
    <div className="space-y-4">
      <GenerateRecommendationPanel category="sales" />

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <TotalSales />
        <TotalProductSales />
        <TotalCustomer />
        <AvgOrderValue />
      </div>

      <div className="grid grid-cols-1 gap-3 md:gap-4 xl:grid-cols-4">
        <div className="xl:col-span-2">
          <LiveActivity />
        </div>
        <FavoriteProduct />
        <PaymentMethod />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        <PeakPerformance />
        <ReportAnalytics />
      </div>
    </div>
  );
}
