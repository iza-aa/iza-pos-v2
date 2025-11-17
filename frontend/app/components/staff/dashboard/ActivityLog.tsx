"use client";

import { ClockIcon, ChartPieIcon } from "@heroicons/react/24/outline";

export default function EfficiencyBreakdown() {
  const efficiencyData = [
    {
      label: "Active Work Time",
      value: "6h 24m",
      percentage: 85,
      color: "bg-green-500",
      icon: "🟢",
    },
    {
      label: "Idle Time",
      value: "1h 8m",
      percentage: 15,
      color: "bg-gray-400",
      icon: "⚪",
    },
  ];

  const workloadPerHour = [
    { hour: "09:00", orders: 5, efficiency: 90 },
    { hour: "10:00", orders: 7, efficiency: 95 },
    { hour: "11:00", orders: 8, efficiency: 98 },
    { hour: "12:00", orders: 12, efficiency: 100 },
    { hour: "13:00", orders: 10, efficiency: 92 },
  ];

  const peakPerformance = workloadPerHour.reduce((prev, current) => 
    current.efficiency > prev.efficiency ? current : prev
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Efficiency Breakdown</h3>
          <p className="text-sm text-gray-500 mt-1">Today&apos;s work efficiency analysis</p>
        </div>
        <ChartPieIcon className="h-6 w-6 text-gray-400" />
      </div>

      {/* Efficiency Distribution */}
      <div className="mb-6">
        <div className="flex gap-2 h-8 rounded-lg overflow-hidden mb-4">
          {efficiencyData.map((data, index) => (
            <div
              key={index}
              className={`${data.color} transition-all hover:opacity-80`}
              style={{ width: `${data.percentage}%` }}
              title={`${data.label}: ${data.value}`}
            />
          ))}
        </div>

        <div className="space-y-3">
          {efficiencyData.map((data, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">{data.icon}</span>
                <span className="text-sm text-gray-700">{data.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">{data.value}</span>
                <span className="text-xs text-gray-500">({data.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Workload per Hour */}
      <div className="pt-4 border-t border-gray-200 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <ClockIcon className="h-4 w-4 text-gray-500" />
          <h4 className="text-sm font-semibold text-gray-700">Workload per Hour</h4>
        </div>
        <div className="space-y-2">
          {workloadPerHour.map((data, index) => (
            <div key={index} className="flex items-center justify-between text-xs">
              <span className="text-gray-600 w-16">{data.hour}</span>
              <div className="flex-1 mx-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      data.efficiency >= 95 ? "bg-green-500" : data.efficiency >= 85 ? "bg-blue-500" : "bg-yellow-500"
                    }`}
                    style={{ width: `${data.efficiency}%` }}
                  />
                </div>
              </div>
              <span className="text-gray-900 font-semibold w-12 text-right">{data.orders} orders</span>
            </div>
          ))}
        </div>
      </div>

      {/* Peak Hour Performance */}
      <div className="pt-4 border-t border-gray-200">
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">Peak Hour Performance</p>
              <p className="text-sm font-semibold text-gray-900">{peakPerformance.hour} - {peakPerformance.orders} orders</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-600 mb-1">Efficiency</p>
              <p className="text-lg font-bold text-blue-600">{peakPerformance.efficiency}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
