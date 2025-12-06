"use client";

import { useState, useEffect } from "react";
import { 
  PerformanceSummary, 
  ProductivityTrend, 
  EfficiencyBreakdown, 
  KPIComparison, 
  StaffShiftCard 
} from "@/app/components/staff/dashboard";

export default function StaffDashboardPage() {
  const [userName, setUserName] = useState("");
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    // Check if user is actually a staff
    const userRole = localStorage.getItem("user_role");
    
    // If not staff or owner, redirect to appropriate dashboard
    if (userRole === "manager") {
      window.location.href = "/manager/dashboard";
      return;
    } else if (userRole !== "owner" && userRole !== "staff") {
      window.location.href = "/staff/login";
      return;
    }

    // Get user name from localStorage
    const name = localStorage.getItem("user_name") || "Staff";
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
    <div className="min-h-screen">
      <div>
        <div className="bg white px-6 pt-6 border-b border-gray-200">
        {/* Header */}
            <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">{greeting}, {userName}! 👋</h1>
            <p className="text-gray-600 mt-2">Here's your performance overview for today.</p>
            </div>

                        <div className="w-full mb-6">
                <PerformanceSummary />
            </div>
        </div>

        <div className="bg-gray-200 p-6">
            {/* Grid Layout */}
            <div className="space-y-6">
            {/* Performance Summary - Full Width */}


            {/* Two Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                <ProductivityTrend />
                <StaffShiftCard />
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                <KPIComparison />
                <EfficiencyBreakdown />
                </div>
            </div>
            </div>
        </div>
      </div>
    </div>
  );
}
