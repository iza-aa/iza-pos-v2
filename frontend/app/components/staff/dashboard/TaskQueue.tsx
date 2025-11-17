"use client";

import { ChartBarIcon, ClockIcon } from "@heroicons/react/24/outline";

export default function ProductivityTrend() {
  const dailyOrders = [
    { day: "Mon", orders: 18, color: "bg-blue-500" },
    { day: "Tue", orders: 22, color: "bg-blue-500" },
    { day: "Wed", orders: 24, color: "bg-blue-600" },
    { day: "Thu", orders: 20, color: "bg-blue-500" },
    { day: "Fri", orders: 26, color: "bg-blue-600" },
    { day: "Sat", orders: 15, color: "bg-blue-400" },
    { day: "Sun", orders: 12, color: "bg-blue-400" },
  ];

  const maxOrders = Math.max(...dailyOrders.map(d => d.orders));

  const peakHours = [
    { hour: "09:00-10:00", orders: 8, percentage: 80 },
    { hour: "12:00-13:00", orders: 12, percentage: 100 },
    { hour: "15:00-16:00", orders: 6, percentage: 60 },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Productivity Trend</h3>
          <p className="text-sm text-gray-500 mt-1">Your performance over the week</p>
        </div>
        <ChartBarIcon className="h-6 w-6 text-gray-400" />
      </div>

      {/* Daily Orders Chart */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Orders Completed per Day</h4>
        <div className="flex items-end justify-between gap-2 h-40">
          {dailyOrders.map((data, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div className="w-full flex items-end justify-center h-32">
                <div
                  className={`w-full ${data.color} rounded-t-lg transition-all hover:opacity-80`}
                  style={{ height: `${(data.orders / maxOrders) * 100}%` }}
                  title={`${data.orders} orders`}
                />
              </div>
              <p className="text-xs text-gray-600 mt-2 font-medium">{data.day}</p>
              <p className="text-xs text-gray-500">{data.orders}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Peak Hours */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <ClockIcon className="h-4 w-4 text-gray-500" />
          <h4 className="text-sm font-semibold text-gray-700">Most Productive Hours</h4>
        </div>
        <div className="space-y-2">
          {peakHours.map((hour, index) => (
            <div key={index}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-600">{hour.hour}</span>
                <span className="text-gray-900 font-semibold">{hour.orders} orders</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${hour.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trend Indicator */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Weekly Trend</span>
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-green-600">↑ +12%</span>
            <span className="text-xs text-gray-500">vs last week</span>
          </div>
        </div>
      </div>
    </div>
  );
}
