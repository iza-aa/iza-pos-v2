"use client"

import React from "react"
import { CalendarIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline"

interface AnalyticsHeaderProps {
  showDatePicker: boolean
  setShowDatePicker: (show: boolean) => void
}

export default function AnalyticsHeader({ showDatePicker, setShowDatePicker }: AnalyticsHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          Good Morning, Fajar 👋
        </h1>
        <p className="text-gray-500 text-sm">Here's your overview for today!</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowDatePicker(!showDatePicker)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl  text-gray-700 hover:bg-gray-50 transition"
        >
          <CalendarIcon className="h-5 w-5" />
          <span className="text-sm font-medium">Date Period</span>
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition">
          <ArrowDownTrayIcon className="h-5 w-5" />
          <span className="text-sm font-medium">Export Report</span>
        </button>
      </div>
    </div>
  )
}
