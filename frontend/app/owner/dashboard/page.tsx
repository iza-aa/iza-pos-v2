"use client"

import React, { useState, useEffect } from "react"
import TotalSales from "@/app/components/owner/dashboard/analytics/totalsales"
import TotalProductSales from "@/app/components/owner/dashboard/analytics/totalproductsales"
import TotalCustomer from "@/app/components/owner/dashboard/analytics/totalcustomer"
import AvgOrderValue from "@/app/components/owner/dashboard/analytics/avgordervalue"
import ReportAnalytics from "@/app/components/owner/dashboard/analytics/reportanalytics"
import FavoriteProduct from "@/app/components/owner/dashboard/analytics/favoriteproduct"
import PaymentMethod from "@/app/components/owner/dashboard/analytics/paymentmethod"
import PeakPerformance from "@/app/components/owner/dashboard/analytics/peakperformance"
import LowStockAlert from "@/app/components/owner/dashboard/analytics/lowstockalert"
import AnalyticsHeader from "@/app/components/owner/dashboard/analytics/header"
import FloatingAIAssistant from "@/app/components/ui/FloatingAIAssistant"

export default function OwnerDashboardPage() {
  const [showDatePicker, setShowDatePicker] = useState(false)

  useEffect(() => {
    // Check if user is actually an owner
    const userRole = localStorage.getItem("user_role");
    
    // If not owner, redirect to appropriate dashboard
    if (userRole === "staff") {
      window.location.href = "/staff/dashboard";
      return;
    } else if (userRole === "manager") {
      window.location.href = "/manager/dashboard";
      return;
    }
  }, [])

  return (
    <main className="min-h-screen bg-gray-100 px-6 pt-4 pb-6">
      {/* Full Width Analytics Section */}
      <section className="w-full flex flex-col gap-4">
        
        {/* Header with Greeting and Actions */}
        <AnalyticsHeader 
          showDatePicker={showDatePicker}
          setShowDatePicker={setShowDatePicker}
        />

        {/* Analytics Cards - 4 cards dalam grid */}
        <div className="grid grid-cols-4 gap-4">
          <TotalSales />
          <TotalProductSales />
          <TotalCustomer />
          <AvgOrderValue />
        </div>

        {/* Revenue Chart & Favorite Products - Side by Side */}
        <div className="grid grid-cols-2 gap-4">
          <ReportAnalytics />
          <FavoriteProduct />
        </div>

        {/* Payment Method, Peak Performance & Low Stock Alert */}
        <div className="grid grid-cols-3 gap-4">
          <PaymentMethod />
          <PeakPerformance />
          <LowStockAlert />
        </div>
      </section>

      {/* Floating AI Assistant */}
      <FloatingAIAssistant />
    </main>
  )
}