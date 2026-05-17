"use client"

import React, { useState, useEffect } from "react"
import { getCurrentUser } from "@/lib/utils"
import TotalSales from "@/app/components/owner/dashboard/analytics/totalsales"
import TotalProductSales from "@/app/components/owner/dashboard/analytics/totalproductsales"
import TotalCustomer from "@/app/components/owner/dashboard/analytics/totalcustomer"
import AvgOrderValue from "@/app/components/owner/dashboard/analytics/avgordervalue"
import ReportAnalytics from "@/app/components/owner/dashboard/analytics/reportanalytics"
import FavoriteProduct from "@/app/components/owner/dashboard/analytics/favoriteproduct"
import PaymentMethod from "@/app/components/owner/dashboard/analytics/paymentmethod"
import PeakPerformance from "@/app/components/owner/dashboard/analytics/peakperformance"
import LowStockAlert from "@/app/components/owner/dashboard/analytics/lowstockalert"
import LiveActivity from "@/app/components/owner/dashboard/analytics/liveactivity"
import AnalyticsHeader from "@/app/components/owner/dashboard/analytics/header"

export default function OwnerDashboardPage() {
  const [showDatePicker, setShowDatePicker] = useState(false)

  useEffect(() => {
    const currentUser = getCurrentUser()

    if (!currentUser) {
      window.location.href = "/owner/login"
      return
    }

    if (currentUser.role === "staff") {
      window.location.href = "/staff/dashboard"
      return
    }

    if (currentUser.role === "manager") {
      window.location.href = "/manager/dashboard"
    }
  }, [])

  return (
    <main className="min-h-screen bg-gray-100 px-4 md:px-6 pt-4 pb-6">
      <section className="w-full flex flex-col gap-3 md:gap-4">
        <AnalyticsHeader
          showDatePicker={showDatePicker}
          setShowDatePicker={setShowDatePicker}
        />

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          <TotalSales />
          <TotalProductSales />
          <TotalCustomer />
          <AvgOrderValue />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-3 md:gap-4">
          <div className="xl:col-span-2">
            <LiveActivity />
          </div>
          <FavoriteProduct />
          <LowStockAlert />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
          <PaymentMethod />
          <PeakPerformance />
          <ReportAnalytics />
        </div>
      </section>
    </main>
  )
}