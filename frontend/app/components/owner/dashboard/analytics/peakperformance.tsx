"use client";

import { ClockIcon, FireIcon } from "@heroicons/react/24/solid";
import { useState, useEffect } from "react";

// Generate heatmap data - hours (vertical) x days (horizontal)
const generateHeatmapData = () => {
  // 6 peak hours for 24-hour coffee shop
  const hours = ["06:00", "09:00", "12:00", "15:00", "18:00", "21:00"];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  
  // Random intensity for demo (0-4, where 4 is darkest gray)
  return hours.map((hour) => ({
    hour,
    values: days.map(() => Math.floor(Math.random() * 5)),
  }));
};

const getColorByIntensity = (intensity: number) => {
  const colors = [
    "bg-gray-100", // 0 - no orders
    "bg-gray-200", // 1 - low
    "bg-gray-400", // 2 - medium-low
    "bg-gray-600", // 3 - medium-high
    "bg-gray-800", // 4 - high
  ];
  return colors[intensity];
};

export default function PeakPerformance() {
  const [heatmapData, setHeatmapData] = useState<Array<{ hour: string; values: number[] }>>([]);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Generate data hanya di client-side untuk menghindari hydration mismatch
  useEffect(() => {
    setHeatmapData(generateHeatmapData());
  }, []);

  // Find busiest time
  const findBusiestTime = () => {
    let maxIntensity = 0;
    let busiestHour = "";
    let busiestDay = "";
    
    heatmapData.forEach((row) => {
      row.values.forEach((intensity, dayIdx) => {
        if (intensity > maxIntensity) {
          maxIntensity = intensity;
          busiestHour = row.hour;
          busiestDay = days[dayIdx];
        }
      });
    });
    
    return { hour: busiestHour, day: busiestDay };
  };

  const busiest = heatmapData.length > 0 ? findBusiestTime() : null;

  return (
    <div className="bg-white rounded-2xl p-5 w-full border border-gray-200 hover:shadow-lg transition">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-gray-100 rounded-xl p-2.5">
            <ClockIcon className="h-5 w-5 text-gray-700" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-800">Peak Performance</h3>
            <p className="text-xs text-gray-500">Orders by hour & day</p>
          </div>
        </div>
        
        {/* Busiest time badge */}
        {busiest && busiest.hour && (
          <div className="flex items-center gap-1 px-3 py-1 rounded-lg" style={{ backgroundColor: '#B2FF5E' }}>
            <FireIcon className="h-3.5 w-3.5" style={{ color: '#166534' }} />
            <span className="text-xs font-semibold" style={{ color: '#166534' }}>
              {busiest.day} {busiest.hour}
            </span>
          </div>
        )}
      </div>

      {/* Heatmap - Centered */}
      <div className="flex justify-center">
        <div className="flex gap-2">
          {/* Y-axis (Hours) */}
          <div className="flex flex-col gap-1.5 text-xs text-gray-500">
            {heatmapData.length > 0 ? (
              heatmapData.map((row, idx) => (
                <div key={idx} className="h-8 flex items-center justify-end pr-2">
                  {row.hour}
                </div>
              ))
            ) : (
              Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="h-8 flex items-center justify-end pr-2">
                  --:--
                </div>
              ))
            )}
          </div>

          {/* Heatmap Grid */}
          <div>
            <div className="flex flex-col gap-1.5">
              {heatmapData.length > 0 ? (
                heatmapData.map((row, rowIdx) => (
                  <div key={rowIdx} className="flex gap-1.5">
                    {row.values.map((intensity, colIdx) => (
                      <div
                        key={colIdx}
                        className={`w-8 h-8 ${getColorByIntensity(intensity)} rounded-lg transition-all hover:scale-110 cursor-pointer`}
                      />
                    ))}
                  </div>
                ))
              ) : (
                Array.from({ length: 6 }).map((_, rowIdx) => (
                  <div key={rowIdx} className="flex gap-1.5">
                    {Array.from({ length: 7 }).map((_, colIdx) => (
                      <div
                        key={colIdx}
                        className="w-8 h-8 bg-gray-100 rounded-lg animate-pulse"
                      />
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* X-axis (Days) */}
            <div className="flex gap-1.5 mt-2">
              {days.map((day, idx) => (
                <div key={idx} className="w-8 text-center text-xs text-gray-500">
                  {day}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 mt-5 pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-500">Less</span>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`w-4 h-4 ${getColorByIntensity(i)} rounded`} />
          ))}
        </div>
        <span className="text-xs text-gray-500">More</span>
      </div>
    </div>
  );
}