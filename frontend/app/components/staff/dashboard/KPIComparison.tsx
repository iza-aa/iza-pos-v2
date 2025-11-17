"use client";

export default function KPIComparison() {
  const kpis = [
    { label: "Orders/Day", current: 24, target: 30, percentage: 80 },
    { label: "Customer Satisfaction", current: 92, target: 95, percentage: 97 },
    { label: "Avg. Response Time", current: 8, target: 5, percentage: 63, unit: "min" },
  ];

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-green-500";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">KPI Comparison</h3>

      <div className="space-y-4">
        {kpis.map((kpi, index) => (
          <div key={index}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">{kpi.label}</span>
              <span className="text-sm text-gray-600">
                {kpi.current}{kpi.unit || ""} / {kpi.target}{kpi.unit || ""}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full ${getProgressColor(kpi.percentage)}`}
                style={{ width: `${kpi.percentage}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-500">{kpi.percentage}% achieved</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
