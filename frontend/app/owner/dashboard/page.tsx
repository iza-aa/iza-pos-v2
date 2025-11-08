"use client"

import React, { useState } from "react"
import TotalSales from "@/app/components/owner/dashboard/analytics/totalsales"
import TotalProductSales from "@/app/components/owner/dashboard/analytics/totalproductsales"
import TotalCustomer from "@/app/components/owner/dashboard/analytics/totalcustomer"
import ReportAnalytics from "@/app/components/owner/dashboard/analytics/reportanalytics"
import FavoriteProduct from "@/app/components/owner/dashboard/analytics/favoriteproduct"
import Chatbot from "@/app/components/owner/dashboard/chatbot/page"
import { CalendarIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline"

export default function OwnerDashboardPage() {
  const [showDatePicker, setShowDatePicker] = useState(false)

  return (
    <main className="min-h-screen bg-gray-50 p-6 flex gap-6 relative">
      {/* Section 1: Analytics - 3/5 layar */}
      <section className="w-full pr-[36%] flex flex-col gap-6">
        {/* Header with Greeting and Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              Good Morning, Fajar 👋
            </h1>
            <p className="text-gray-500 text-sm mt-1">Here's your overview for today!</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              <CalendarIcon className="h-5 w-5" />
              <span className="text-sm font-medium">Date Period</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
              <ArrowDownTrayIcon className="h-5 w-5" />
              <span className="text-sm font-medium">Export Report</span>
            </button>
          </div>
        </div>

        {/* Analytics Cards - 4 cards dalam grid */}
        <div className="grid grid-cols-3 gap-4">
          <TotalSales />
          <TotalProductSales />
          <TotalCustomer />
        </div>

        {/* Revenue Chart & Favorite Products */}
        <ReportAnalytics />
        <FavoriteProduct />
      </section>

      {/* Section 2: Chatbot - 2/5 layar */}
      <section className="w-2/6 bg-white rounded-2xl shadow p-6 flex flex-col fixed top-24 right-6 bottom-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">AI Assistant</h3>
        <div className="flex-1 overflow-hidden">
          <Chatbot />
        </div>
      </section>
    </main>
  )
}