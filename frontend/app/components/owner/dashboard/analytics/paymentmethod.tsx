"use client";

import { ArrowUpRightIcon } from "@heroicons/react/24/outline";
import { CreditCardIcon } from "@heroicons/react/24/solid";

const paymentData = [
  { method: "QRIS", percentage: 40, color: "bg-gray-700", fillColor: "#374151" },
  { method: "Cash", percentage: 30, color: "bg-gray-500", fillColor: "#6b7280" },
  { method: "Debit Card", percentage: 20, color: "bg-gray-400", fillColor: "#9ca3af" },
  { method: "E-Wallet", percentage: 10, color: "bg-gray-300", fillColor: "#d1d5db" },
];

export default function PaymentMethod() {
  return (
    <div className="bg-white rounded-2xl p-5 w-full border border-gray-200 hover:shadow-lg transition h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-gray-100 rounded-xl p-2.5">
            <CreditCardIcon className="h-5 w-5 text-gray-700" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Payment Method</p>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-gray-900">2,456</span>
              <span 
                className="text-xs font-semibold px-2 py-0.5 rounded-md"
                style={{ color: '#166534', backgroundColor: '#B2FF5E' }}
              >
                +8%
              </span>
            </div>
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <circle cx="10" cy="4" r="1.5" />
            <circle cx="10" cy="10" r="1.5" />
            <circle cx="10" cy="16" r="1.5" />
          </svg>
        </button>
      </div>

      {/* Progress Bars */}
      <div className="flex gap-1.5 mb-4">
        {paymentData.map((item, idx) => (
          <div
            key={idx}
            className="relative transition-all hover:scale-105 cursor-pointer"
            style={{ width: `${item.percentage}%`, height: '48px' }}
          >
            <svg width="100%" height="100%" className="overflow-visible">
              <defs>
                <pattern 
                  id={`diagonal-payment-${idx}`} 
                  patternUnits="userSpaceOnUse" 
                  width="8" 
                  height="8" 
                  patternTransform="rotate(45)"
                >
                  <line x1="0" y1="0" x2="0" y2="8" stroke="white" strokeWidth="2" opacity="0.4" />
                </pattern>
                <pattern 
                  id={`diagonal-fill-${idx}`} 
                  patternUnits="userSpaceOnUse" 
                  width="8" 
                  height="8" 
                  patternTransform="rotate(45)"
                >
                  <rect width="8" height="8" fill={item.fillColor} />
                  <line x1="0" y1="0" x2="0" y2="8" stroke="white" strokeWidth="2" opacity="0.3" />
                </pattern>
              </defs>
              {/* Outer border */}
              <rect
                width="100%"
                height="100%"
                rx="12"
                ry="12"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="2"
              />
              {/* Inner fill with diagonal pattern and padding */}
              <rect
                x="4"
                y="4"
                width="calc(100% - 8px)"
                height="calc(100% - 8px)"
                rx="10"
                ry="10"
                fill={`url(#diagonal-fill-${idx})`}
              />
            </svg>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-1.5">
        {paymentData.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 ${item.color} rounded-sm`} />
              <span className="text-sm text-gray-600">{item.method}</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">{item.percentage}%</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
        <span className="text-xs text-gray-500">+234 transactions from last month</span>
        <ArrowUpRightIcon className="h-4 w-4 text-gray-400" />
      </div>
    </div>
  );
}