"use client";

import { ArrowUpRightIcon, ArrowTrendingUpIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon, ClockIcon, ExclamationTriangleIcon, TrophyIcon } from "@heroicons/react/24/solid";

export default function PerformanceSummary() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Orders Completed */}
      <div className="bg-gray-100 rounded-2xl p-[3px] w-full border border-gray-200">
        <div className="bg-white rounded-xl p-4 mb-3 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 rounded-xl p-3">
              <CheckCircleIcon className="h-6 w-6 text-blue-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm text-gray-500">Orders Completed</p>
                <span className="flex items-center gap-1">
                  <ArrowTrendingUpIcon className="h-3 w-3 text-green-600" />
                  <span className="text-xs font-semibold text-green-600">15%</span>
                </span>
              </div>
              <span className="text-2xl font-bold text-gray-900">24</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between px-1 pb-2">
          <span className="text-sm text-gray-600"><span className="font-semibold">+3</span> from yesterday</span>
          <ArrowUpRightIcon className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* Average Completion Time */}
      <div className="bg-gray-100 rounded-2xl p-[3px] w-full border border-gray-200">
        <div className="bg-white rounded-xl p-4 mb-3 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 rounded-xl p-3">
              <ClockIcon className="h-6 w-6 text-purple-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm text-gray-500">Avg. Completion Time</p>
                <span className="flex items-center gap-1">
                  <ArrowTrendingUpIcon className="h-3 w-3 text-green-600" />
                  <span className="text-xs font-semibold text-green-600">8%</span>
                </span>
              </div>
              <span className="text-2xl font-bold text-gray-900">8 min</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between px-1 pb-2">
          <span className="text-sm text-gray-600"><span className="font-semibold">-2 min</span> faster</span>
          <ArrowUpRightIcon className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* Input Errors */}
      <div className="bg-gray-100 rounded-2xl p-[3px] w-full border border-gray-200">
        <div className="bg-white rounded-xl p-4 mb-3 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 rounded-xl p-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm text-gray-500">Input Errors</p>
                <span className="flex items-center gap-1">
                  <ArrowTrendingUpIcon className="h-3 w-3 text-green-600" />
                  <span className="text-xs font-semibold text-green-600">2%</span>
                </span>
              </div>
              <span className="text-2xl font-bold text-gray-900">3</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between px-1 pb-2">
          <span className="text-sm text-gray-600"><span className="font-semibold">-1</span> from yesterday</span>
          <ArrowUpRightIcon className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* Performance Score */}
      <div className="bg-gray-100 rounded-2xl p-[3px] w-full border border-gray-200">
        <div className="bg-white rounded-xl p-4 mb-3 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 rounded-xl p-3">
              <TrophyIcon className="h-6 w-6 text-green-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm text-gray-500">Performance Score</p>
                <span className="flex items-center gap-1">
                  <ArrowTrendingUpIcon className="h-3 w-3 text-green-600" />
                  <span className="text-xs font-semibold text-green-600">5%</span>
                </span>
              </div>
              <span className="text-2xl font-bold text-gray-900">92%</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between px-1 pb-2">
          <span className="text-sm text-gray-600"><span className="font-semibold">+4%</span> from last week</span>
          <ArrowUpRightIcon className="h-4 w-4 text-gray-400" />
        </div>
      </div>
    </div>
  );
}
