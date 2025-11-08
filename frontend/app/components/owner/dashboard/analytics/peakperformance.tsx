"use client";

import { ClockIcon } from "@heroicons/react/24/solid";

// Generate heatmap data - hours (vertical) x days (horizontal)
const generateHeatmapData = () => {
  // 6 peak hours for 24-hour coffee shop
  const hours = ["06:00", "09:00", "12:00", "15:00", "18:00", "21:00"];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  
  // Random intensity for demo (0-4, where 4 is darkest blue)
  return hours.map((hour) => ({
    hour,
    values: days.map(() => Math.floor(Math.random() * 5)),
  }));
};

const getColorByIntensity = (intensity: number) => {
  const colors = [
    "bg-gray-200", // 0 - no orders
    "bg-blue-200", // 1 - low
    "bg-blue-300", // 2 - medium-low
    "bg-blue-500", // 3 - medium-high
    "bg-blue-700", // 4 - high
  ];
  return colors[intensity];
};

export default function PeakPerformance() {
  const heatmapData = generateHeatmapData();
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="bg-white rounded-2xl shadow p-5 w-full border border-gray-100">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-blue-100 rounded-xl p-2.5">
          <ClockIcon className="h-5 w-5 text-blue-500" />
        </div>
        <h3 className="text-base font-semibold text-gray-800">Peak Performance</h3>
      </div>

      {/* Heatmap */}
      <div className="flex gap-3">
        {/* Y-axis (Hours) */}
        <div className="flex flex-col justify-between py-1 text-xs text-gray-500 min-w-[45px]">
          {heatmapData.map((row, idx) => (
            <div key={idx} className="h-8 flex items-center justify-end pr-2">
              {row.hour}
            </div>
          ))}
        </div>

        {/* Heatmap Grid */}
        <div className="flex-1">
          <div className="flex flex-col gap-1.5">
            {heatmapData.map((row, rowIdx) => (
              <div key={rowIdx} className="flex gap-1.5">
                {row.values.map((intensity, colIdx) => (
                  <div
                    key={colIdx}
                    className={`flex-1 h-8 ${getColorByIntensity(intensity)} rounded-lg transition-all hover:scale-105 cursor-pointer`}
                    title={`${row.hour} - ${days[colIdx]}: ${intensity * 25}% capacity`}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* X-axis (Days) */}
          <div className="flex gap-1.5 mt-2">
            {days.map((day, idx) => (
              <div key={idx} className="flex-1 text-center text-xs text-gray-500">
                {day}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}