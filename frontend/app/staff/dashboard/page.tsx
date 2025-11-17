"use client";

import { 
  PerformanceSummary, 
  ProductivityTrend, 
  EfficiencyBreakdown, 
  KPIComparison, 
  StaffShiftCard 
} from "@/app/components/staff/dashboard";

export default function StaffDashboardPage() {
  return (
    <div className="min-h-screen">
      <div>
        <div className="bg white px-6 pt-6 border-b border-gray-200">
        {/* Header */}
            <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Staff Dashboard</h1>
            <p className="text-gray-600 mt-2">Welcome back! Here's your performance overview.</p>
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
