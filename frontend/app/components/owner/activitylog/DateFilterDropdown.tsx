'use client'

import { useState } from 'react'
import { CalendarIcon } from '@heroicons/react/24/outline'

export type DateFilterType = 'today' | 'week' | 'month' | 'custom' | 'all'

interface DateFilterDropdownProps {
  dateFilter: DateFilterType
  onDateFilterChange: (filter: DateFilterType) => void
  customDateRange: { start: string; end: string }
  onCustomDateRangeChange: (range: { start: string; end: string }) => void
}

export default function DateFilterDropdown({ 
  dateFilter, 
  onDateFilterChange,
  customDateRange,
  onCustomDateRangeChange
}: DateFilterDropdownProps) {
  const [showDropdown, setShowDropdown] = useState(false)

  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case 'today': return 'Today'
      case 'week': return 'This Week'
      case 'month': return 'This Month'
      case 'custom': return 'Custom Range'
      default: return 'All Time'
    }
  }

  const handleDateFilterSelect = (filter: DateFilterType) => {
    onDateFilterChange(filter)
    setShowDropdown(false)
  }

  const handleCustomDateChange = (field: 'start' | 'end', value: string) => {
    const newRange = { ...customDateRange, [field]: value }
    onCustomDateRangeChange(newRange)
    
    if (newRange.start && newRange.end) {
      onDateFilterChange('custom')
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center gap-2 h-[42px] px-4 border rounded-xl transition ${
          dateFilter !== 'all'
            ? 'bg-gray-800 border-gray-800 text-white'
            : 'border-gray-300 hover:bg-gray-50'
        }`}
      >
        <CalendarIcon className="w-5 h-5" />
        <span className="text-sm font-medium">{getDateFilterLabel()}</span>
      </button>

      {/* Date Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
          <div className="p-2">
            <button
              onClick={() => handleDateFilterSelect('all')}
              className={`w-full text-left px-4 py-2 rounded-lg text-sm transition ${
                dateFilter === 'all'
                  ? 'bg-gray-800 text-white font-medium'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => handleDateFilterSelect('today')}
              className={`w-full text-left px-4 py-2 rounded-lg text-sm transition ${
                dateFilter === 'today'
                  ? 'bg-gray-800 text-white font-medium'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => handleDateFilterSelect('week')}
              className={`w-full text-left px-4 py-2 rounded-lg text-sm transition ${
                dateFilter === 'week'
                  ? 'bg-gray-800 text-white font-medium'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              This Week (Last 7 Days)
            </button>
            <button
              onClick={() => handleDateFilterSelect('month')}
              className={`w-full text-left px-4 py-2 rounded-lg text-sm transition ${
                dateFilter === 'month'
                  ? 'bg-gray-800 text-white font-medium'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              This Month (Last 30 Days)
            </button>
            
            <div className="border-t border-gray-200 my-2"></div>
            
            <div className="px-4 py-2">
              <label className="text-sm font-medium text-gray-700 block mb-2">Custom Range</label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={customDateRange.start}
                  onChange={(e) => handleCustomDateChange('start', e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={customDateRange.end}
                  onChange={(e) => handleCustomDateChange('end', e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {customDateRange.start && customDateRange.end && (
                  <button
                    onClick={() => setShowDropdown(false)}
                    className="w-full px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                  >
                    Apply
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
