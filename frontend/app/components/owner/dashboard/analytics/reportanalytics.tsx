"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowUpRightIcon } from "@heroicons/react/24/outline";
import { ChartBarIcon } from "@heroicons/react/24/solid";

const weeklyData = [
  { day: "Mon", amount: 10000 },
  { day: "Tue", amount: 25000 },
  { day: "Wed", amount: 15000 },
  { day: "Thu", amount: 35000 },
  { day: "Fri", amount: 45000 },
  { day: "Sat", amount: 20000 },
  { day: "Sun", amount: 18000 },
];

const categories = ["All", "Foods", "Desserts", "Drinks", "Snacks", "Pastries", "Beverages"];

export default function ReportAnalytics() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedDay, setSelectedDay] = useState("Sat");

  // Calculate metrics
  const totalAmount = weeklyData.reduce((sum, item) => sum + item.amount, 0);
  const avgAmount = totalAmount / weeklyData.length;
  const selectedDayData = weeklyData.find(item => item.day === selectedDay);
  const growth = selectedDayData ? selectedDayData.amount - avgAmount : 0;
  const growthPercentage = avgAmount > 0 ? (growth / avgAmount) * 100 : 0;

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 rounded-full p-2">
            <ChartBarIcon className="h-6 w-6 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Report Analytics</h3>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition">
            Weekly
          </button>
          <ArrowUpRightIcon className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
              activeCategory === category
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-[312.4px] mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeklyData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <pattern id="diagonalStripes" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="8" stroke="#d1d5db" strokeWidth="2" />
              </pattern>
              <pattern id="diagonalStripesWhite" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                <rect width="8" height="8" fill="#3b82f6" />
                <line x1="0" y1="0" x2="0" y2="8" stroke="white" strokeWidth="2" />
              </pattern>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis 
              dataKey="day" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={(value) => `${value / 1000}k`}
            />
            <Tooltip
              cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
              }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']}
            />
            <Bar
              dataKey="amount"
              fill="#e5e7eb"
              radius={[20, 20, 20, 20]}
              maxBarSize={60}
              onClick={(data: any) => setSelectedDay(data.day)}
              shape={(props: any) => {
                const { fill, x, y, width, height, payload } = props;
                const isSelected = payload.day === selectedDay;
                const padding = 4; // padding untuk arsiran
                return (
                  <g>
                    {/* Outline bar */}
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      fill="none"
                      stroke={isSelected ? "#2563eb" : "#e0e0e0ff"}
                      strokeWidth="2"
                      rx={20}
                      ry={20}
                    />
                    {/* Arsiran dengan padding */}
                    <rect
                      x={x + padding}
                      y={y + padding}
                      width={width - padding * 2}
                      height={height - padding * 2}
                      fill={isSelected ? "url(#diagonalStripesWhite)" : "url(#diagonalStripes)"}
                      rx={18}
                      ry={18}
                    />
                    {isSelected && (
                      <>
                        <text
                          x={x + width / 2}
                          y={y - 10}
                          textAnchor="middle"
                          fill="#1f2937"
                          fontSize="12"
                          fontWeight="600"
                        >
                          ${payload.amount.toLocaleString()}
                        </text>
                        <circle
                          cx={x + width / 2}
                          cy={y + height / 2}
                          r={3}
                          fill="#3b82f6"
                        />
                      </>
                    )}
                  </g>
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 ">
        <div className="bg-gray-100 border border-gray-200 rounded-xl p-4">
          <p className="text-xl text-gray-500 mb-1">Amount</p>
          <p className="text-2xl font-bold text-gray-900">${totalAmount.toLocaleString()}</p>
        </div>
        <div className="bg-gray-100 border border-gray-200 rounded-xl p-4">
          <p className="text-xl text-gray-500 mb-1">Growth</p>
          <p className="text-2xl font-bold text-green-500">+${Math.abs(growth).toLocaleString()}</p>
        </div>
        <div className="bg-gray-100 border border-gray-200 rounded-xl p-4">
          <p className="text-xl text-gray-500 mb-1">Growth Percentage</p>
          <p className="text-2xl font-bold text-gray-900">{growthPercentage.toFixed(2)}%</p>
        </div>
      </div>
    </div>
  );
}

