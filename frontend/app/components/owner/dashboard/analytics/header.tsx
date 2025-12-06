"use client"

import React, { useState, useEffect } from "react"
import { CalendarIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline"

interface AnalyticsHeaderProps {
  showDatePicker: boolean
  setShowDatePicker: (show: boolean) => void
}

export default function AnalyticsHeader({ showDatePicker, setShowDatePicker }: AnalyticsHeaderProps) {
  const [userName, setUserName] = useState("");
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    // Check if user is actually an owner
    const userRole = localStorage.getItem("user_role");
    
    // If not owner, don't show greeting
    if (userRole !== "owner") {
      return;
    }

    // Get user name from localStorage
    const name = localStorage.getItem("user_name") || "Owner";
    setUserName(name);

    // Set greeting based on time
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting("Good Morning");
    } else if (hour < 18) {
      setGreeting("Good Afternoon");
    } else {
      setGreeting("Good Evening");
    }
  }, []);

  return (
    <div className="flex items-center justify-between bg-white px-6 py-6 border-b border-gray-200 -mx-6 -mt-4 mb-2">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          {greeting}, {userName} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">Here's your overview for today!</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowDatePicker(!showDatePicker)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl  text-gray-700 hover:bg-gray-50 transition"
        >
          <CalendarIcon className="h-5 w-5" />
          <span className="text-sm font-medium">Date Period</span>
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition">
          <ArrowDownTrayIcon className="h-5 w-5" />
          <span className="text-sm font-medium">Export Report</span>
        </button>
      </div>
    </div>
  )
}
