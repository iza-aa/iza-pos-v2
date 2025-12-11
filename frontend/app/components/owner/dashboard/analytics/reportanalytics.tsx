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
    <div className="bg-white rounded-2xl border border-gray-200 hover:shadow-lg transition-shadow duration-300 overflow-hidden h-full">
      {/* Header */}
      <div className="p-3 md:p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="bg-gray-100 rounded-xl p-2">
              <ChartBarIcon className="h-4 md:h-5 w-4 md:w-5 text-gray-700" />
            </div>
            <div>
              <h3 className="text-sm md:text-base font-semibold text-gray-800">Report Analytics</h3>
              <p className="text-[10px] md:text-xs text-gray-500">Weekly revenue overview</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-2 md:px-3 py-1 md:py-1.5 bg-gray-100 text-gray-700 rounded-lg text-[10px] md:text-xs font-medium hover:bg-gray-200 transition">
              Weekly
            </button>
            <ArrowUpRightIcon className="h-3 md:h-4 w-3 md:w-4 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 md:p-4">
        {/* Category Filter */}
        <div className="flex gap-2 mb-3 md:mb-4 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium whitespace-nowrap transition ${
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
        <div className="h-[150px] md:h-[180px] mb-3 md:mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <pattern id="diagonalStripes" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="8" stroke="#d1d5db" strokeWidth="2" />
              </pattern>
              <pattern id="diagonalStripesSelected" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                <rect width="8" height="8" fill="#374151" />
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
              width={40}
            />
            <Tooltip
              cursor={{ fill: 'rgba(55, 65, 81, 0.1)' }}
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
              }}
              formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, 'Amount']}
            />
            <Bar
              dataKey="amount"
              fill="#e5e7eb"
              radius={[16, 16, 16, 16]}
              maxBarSize={65}
              onClick={(data: any) => setSelectedDay(data.day)}
              shape={(props: any) => {
                const { x, y, width, height, payload } = props;
                const isSelected = payload.day === selectedDay;
                const padding = 4;
                return (
                  <g>
                    {/* Outline bar */}
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      fill="none"
                      stroke={isSelected ? "#374151" : "#e0e0e0ff"}
                      strokeWidth="2"
                      rx={16}
                      ry={16}
                    />
                    {/* Arsiran dengan padding */}
                    <rect
                      x={x + padding}
                      y={y + padding}
                      width={width - padding * 2}
                      height={height - padding * 2}
                      fill={isSelected ? "url(#diagonalStripesSelected)" : "url(#diagonalStripes)"}
                      rx={14}
                      ry={14}
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
                          Rp {(payload.amount / 1000).toFixed(0)}k
                        </text>
                        <circle
                          cx={x + width / 2}
                          cy={y + height / 2}
                          r={3}
                          fill="#374151"
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
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-2 md:p-3">
            <div className="flex items-center gap-1 md:gap-2 mb-1">
              <p className="text-xs md:text-sm text-gray-500">Amount</p>
            </div>
            <p className="text-sm md:text-base font-bold text-gray-900">Rp {(totalAmount / 1000).toFixed(0)}k</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-2 md:p-3">
            <div className="flex items-center gap-1 md:gap-2 mb-1 flex-wrap">
              <p className="text-xs md:text-sm text-gray-500">Growth</p>
              <span 
                className="text-[10px] md:text-xs font-semibold px-1.5 py-0.5 rounded"
                style={{ 
                  backgroundColor: growth >= 0 ? '#B2FF5E' : '#FF6859',
                  color: growth >= 0 ? '#166534' : '#7f1d1d'
                }}
              >
                {growth >= 0 ? '+' : ''}{((growth / avgAmount) * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-sm md:text-base font-bold text-gray-900">
              {growth >= 0 ? '+' : '-'}Rp {(Math.abs(growth) / 1000).toFixed(0)}k
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-2 md:p-3">
            <div className="flex items-center gap-1 md:gap-2 mb-1 flex-wrap">
              <p className="text-xs md:text-sm text-gray-500">Growth %</p>
              <span 
                className="text-[10px] md:text-xs font-semibold px-1.5 py-0.5 rounded"
                style={{ 
                  backgroundColor: growthPercentage >= 0 ? '#B2FF5E' : '#FF6859',
                  color: growthPercentage >= 0 ? '#166534' : '#7f1d1d'
                }}
              >
                {growthPercentage >= 0 ? '+' : ''}{growthPercentage.toFixed(0)}%
              </span>
            </div>
            <p className="text-sm md:text-base font-bold text-gray-900">
              {growthPercentage >= 0 ? '+' : ''}{growthPercentage.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

