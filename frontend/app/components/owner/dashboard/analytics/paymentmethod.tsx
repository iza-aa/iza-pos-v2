"use client";

import { ArrowUpRightIcon } from "@heroicons/react/24/outline";
import { CreditCardIcon } from "@heroicons/react/24/solid";

const paymentData = [
  { method: "QRIS", percentage: 40, color: "bg-blue-500", fillColor: "#3b82f6" },
  { method: "Cash", percentage: 30, color: "bg-green-500", fillColor: "#22c55e" },
  { method: "Debit Card", percentage: 20, color: "bg-cyan-400", fillColor: "#22d3ee" },
  { method: "E-Wallet", percentage: 10, color: "bg-yellow-400", fillColor: "#facc15" },
];

export default function PaymentMethod() {
  return (
    <div className="bg-gray-100 rounded-2xl p-[3px] w-full border border-gray-200">
      {/* Header */}
      <div className="bg-white rounded-xl p-4 mb-3 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 rounded-xl p-3">
              <CreditCardIcon className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Payment Method</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-900">2,456</span>
                <span className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-md">
                  <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span className="text-xs font-semibold text-green-600">8%</span>
                </span>
              </div>
            </div>
          </div>
          <button className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
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
              style={{ width: `${item.percentage}%`, height: '56px' }}
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
        <div className="space-y-2">
          {paymentData.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 ${item.color} rounded-sm`} />
                <span className="text-sm text-gray-600">{item.method}</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{item.percentage}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="flex items-center justify-between px-1">
        <span className="text-sm text-gray-600">+234 transactions from last month</span>
        <ArrowUpRightIcon className="h-4 w-4 text-gray-400" />
      </div>
    </div>
  );
}