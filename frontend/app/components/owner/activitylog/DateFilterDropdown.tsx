'use client'

import { useState } from 'react'
import { CalendarIcon } from '@heroicons/react/24/outline'
import { useLanguage } from '../../shared/i18n'

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
  const { t } = useLanguage()
  const [showDropdown, setShowDropdown] = useState(false)

  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case 'today': return t('owner.activity.today')
      case 'week': return t('owner.activity.thisWeek')
      case 'month': return t('owner.activity.thisMonth')
      case 'custom': return t('owner.activity.customRange')
      default: return t('owner.activity.allTime')
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
        <div className="absolute left-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-[calc(100vh-200px)] overflow-y-auto mr-4">
          <div className="p-2">
            <button
              onClick={() => handleDateFilterSelect('all')}
              className={`w-full text-left px-4 py-2 rounded-lg text-sm transition ${
                dateFilter === 'all'
                  ? 'bg-gray-800 text-white font-medium'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              {t('owner.activity.allTime')}
            </button>
            <button
              onClick={() => handleDateFilterSelect('today')}
              className={`w-full text-left px-4 py-2 rounded-lg text-sm transition ${
                dateFilter === 'today'
                  ? 'bg-gray-800 text-white font-medium'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              {t('owner.activity.today')}
            </button>
            <button
              onClick={() => handleDateFilterSelect('week')}
              className={`w-full text-left px-4 py-2 rounded-lg text-sm transition ${
                dateFilter === 'week'
                  ? 'bg-gray-800 text-white font-medium'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              {t('owner.activity.thisWeekLast7')}
            </button>
            <button
              onClick={() => handleDateFilterSelect('month')}
              className={`w-full text-left px-4 py-2 rounded-lg text-sm transition ${
                dateFilter === 'month'
                  ? 'bg-gray-800 text-white font-medium'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              {t('owner.activity.thisMonthLast30')}
            </button>
            
            <div className="border-t border-gray-200 my-2"></div>
            
            <div className="px-4 py-2">
              <label className="text-sm font-medium text-gray-700 block mb-2">{t('owner.activity.customRange')}</label>
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
                    {t('owner.activity.apply')}
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
