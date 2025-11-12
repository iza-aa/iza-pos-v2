"use client"

import React, { useState } from "react"
import TotalSales from "@/app/components/owner/dashboard/analytics/totalsales"
import TotalProductSales from "@/app/components/owner/dashboard/analytics/totalproductsales"
import TotalCustomer from "@/app/components/owner/dashboard/analytics/totalcustomer"
import ReportAnalytics from "@/app/components/owner/dashboard/analytics/reportanalytics"
import FavoriteProduct from "@/app/components/owner/dashboard/analytics/favoriteproduct"
import PaymentMethod from "@/app/components/owner/dashboard/analytics/paymentmethod"
import PeakPerformance from "@/app/components/owner/dashboard/analytics/peakperformance"
import AnalyticsHeader from "@/app/components/owner/dashboard/analytics/header"
import Chatbot from "@/app/components/owner/dashboard/chatbot/page"

export default function OwnerDashboardPage() {
  const [showDatePicker, setShowDatePicker] = useState(false)

  return (
    <main className="min-h-screen bg-gray-100 px-6 pt-4 pb-6 flex  relative">
      {/* Section 1: Analytics - 3/5 layar */}
      <section className="w-full pr-[36%] flex flex-col gap-6">
        
        {/* Header with Greeting and Actions */}
        <AnalyticsHeader 
          showDatePicker={showDatePicker}
          setShowDatePicker={setShowDatePicker}
        />

        {/* Analytics Cards - 4 cards dalam grid */}
        <div className="grid grid-cols-3 gap-4">
          <TotalSales />
          <TotalProductSales />
          <TotalCustomer />
        </div>

        {/* Revenue Chart & Favorite Products */}
        <ReportAnalytics />
        <FavoriteProduct />

        {/* Payment Method & Peak Performance */}
        <div className="grid grid-cols-2 gap-4">
          <PaymentMethod />
          <PeakPerformance />
        </div>
      </section>

      {/* Section 2: Chatbot - 2/5 layar */}
      <section className="w-2/6 bg-white rounded-2xl p-6 flex flex-col fixed top-20 right-6 bottom-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">AI Assistant</h3>
        <div className="flex-1 overflow-hidden">
          <Chatbot />
        </div>
      </section>
    </main>
  )
}