'use client'

import { useState, useMemo } from 'react'
import { 
  MagnifyingGlassIcon, 
  EyeIcon, 
  EyeSlashIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  Squares2X2Icon,
  TableCellsIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import { activityLogs } from '@/lib/mockData'
import { 
  ActivityLog, 
  ActivityLogFilters as Filters,
} from '@/lib/activityTypes'
import {
  ActivityLogStats,
  ActivityLogFilters,
  ActivityLogCard,
  ActivityLogTable,
  ActivityLogDetail
} from '@/app/components/owner/activitylog'

type ViewMode = 'card' | 'table'
type DateFilter = 'today' | 'week' | 'month' | 'custom' | 'all'

export default function ActivityLogPage() {
  const [logs] = useState<ActivityLog[]>(activityLogs)
  const [showStats, setShowStats] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [showDateDropdown, setShowDateDropdown] = useState(false)
  const [customDateRange, setCustomDateRange] = useState({
    start: '',
    end: ''
  })
  
  // Filters
  const [filters, setFilters] = useState<Filters>({
    severity: undefined,
    category: undefined,
    userRole: undefined,
    action: undefined
  })

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    const todayLogs = logs.filter(log => new Date(log.timestamp) >= todayStart)
    const criticalLogs = logs.filter(log => log.severity === 'critical')
    
    // Count unique users
    const uniqueUsers = new Set(logs.map(log => log.userId)).size
    
    // Top user by activity count
    const userCounts = logs.reduce((acc, log) => {
      acc[log.userName] = (acc[log.userName] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const topUser = Object.entries(userCounts).sort((a, b) => b[1] - a[1])[0]
    
    // Top action
    const actionCounts = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const topAction = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0]
    
    return {
      totalLogs: logs.length,
      todayLogs: todayLogs.length,
      criticalActions: criticalLogs.length,
      uniqueUsers,
      topUser: topUser ? { name: topUser[0], count: topUser[1] } : { name: 'N/A', count: 0 },
      topAction: topAction ? { name: topAction[0], count: topAction[1] } : { name: 'N/A', count: 0 }
    }
  }, [logs])

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const logDate = new Date(log.timestamp)
      const now = new Date()
      
      // Date filter
      if (dateFilter === 'today') {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        if (logDate < todayStart) return false
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        if (logDate < weekAgo) return false
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        if (logDate < monthAgo) return false
      } else if (dateFilter === 'custom' && customDateRange.start && customDateRange.end) {
        const startDate = new Date(customDateRange.start)
        const endDate = new Date(customDateRange.end)
        endDate.setHours(23, 59, 59, 999) // Include the entire end day
        if (logDate < startDate || logDate > endDate) return false
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = 
          log.userName.toLowerCase().includes(query) ||
          log.actionDescription.toLowerCase().includes(query) ||
          log.resourceName?.toLowerCase().includes(query) ||
          log.notes?.toLowerCase().includes(query)
        
        if (!matchesSearch) return false
      }
      
      // Severity filter
      if (filters.severity && log.severity !== filters.severity) return false
      
      // Category filter
      if (filters.category && log.actionCategory !== filters.category) return false
      
      // Role filter
      if (filters.userRole && log.userRole !== filters.userRole) return false
      
      // Action filter
      if (filters.action && log.action !== filters.action) return false
      
      return true
    })
  }, [logs, searchQuery, filters, dateFilter, customDateRange])

  // Clear all filters
  const clearFilters = () => {
    setFilters({})
    setSearchQuery('')
    setDateFilter('all')
    setCustomDateRange({ start: '', end: '' })
  }

  const hasActiveFilters = searchQuery || filters.severity || filters.category || filters.userRole || filters.action

  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case 'today': return 'Today'
      case 'week': return 'This Week'
      case 'month': return 'This Month'
      case 'custom': return 'Custom Range'
      default: return 'All Time'
    }
  }

  return (
    <div className="h-[calc(100vh-55px)] flex flex-col overflow-hidden">
      {/* Header + Stats */}
      <section className="flex-shrink-0 p-6 bg-white border-b border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-gray-800">Activity Logs</h1>
            <p className="text-sm text-gray-500">Track all system activities and user actions</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Toggle Stats */}
            <button 
              onClick={() => setShowStats(!showStats)}
              className="flex items-center justify-center h-[42px] w-10 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
              title={showStats ? "Hide Statistics" : "Show Statistics"}
            >
              {showStats ? (
                <EyeSlashIcon className="w-5 h-5 text-gray-600" />
              ) : (
                <EyeIcon className="w-5 h-5 text-gray-600" />
              )}
            </button>

            {/* Date Filter */}
            <div className="relative">
              <button
                onClick={() => setShowDateDropdown(!showDateDropdown)}
                className={`flex items-center gap-2 h-[42px] px-4 border rounded-xl transition ${
                  dateFilter !== 'all'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                <CalendarIcon className="w-5 h-5" />
                <span className="text-sm font-medium">{getDateFilterLabel()}</span>
              </button>

              {/* Date Dropdown */}
              {showDateDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setDateFilter('all')
                        setShowDateDropdown(false)
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm transition ${
                        dateFilter === 'all'
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      All Time
                    </button>
                    <button
                      onClick={() => {
                        setDateFilter('today')
                        setShowDateDropdown(false)
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm transition ${
                        dateFilter === 'today'
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      onClick={() => {
                        setDateFilter('week')
                        setShowDateDropdown(false)
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm transition ${
                        dateFilter === 'week'
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      This Week (Last 7 Days)
                    </button>
                    <button
                      onClick={() => {
                        setDateFilter('month')
                        setShowDateDropdown(false)
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm transition ${
                        dateFilter === 'month'
                          ? 'bg-blue-50 text-blue-700 font-medium'
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
                          onChange={(e) => {
                            setCustomDateRange({ ...customDateRange, start: e.target.value })
                            if (e.target.value && customDateRange.end) {
                              setDateFilter('custom')
                            }
                          }}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="date"
                          value={customDateRange.end}
                          onChange={(e) => {
                            setCustomDateRange({ ...customDateRange, end: e.target.value })
                            if (customDateRange.start && e.target.value) {
                              setDateFilter('custom')
                            }
                          }}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {customDateRange.start && customDateRange.end && (
                          <button
                            onClick={() => setShowDateDropdown(false)}
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

            {/* View Mode Toggle */}
            <div className="flex items-center h-[42px] border border-gray-300 rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode('card')}
                className={`h-full px-2 transition ${
                  viewMode === 'card'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                title="Card View"
              >
                <Squares2X2Icon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`h-full px-2 transition ${
                  viewMode === 'table'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                title="Table View"
              >
                <TableCellsIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Toggle Filters */}
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 h-[42px] px-4 border rounded-xl transition ${
                showFilters 
                  ? 'bg-blue-50 border-blue-500 text-blue-700' 
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <FunnelIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Filters</span>
              {hasActiveFilters && (
                <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {[filters.severity, filters.category, filters.userRole, filters.action, searchQuery].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Export Button */}
            <button className="flex items-center gap-2 h-[42px] px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">
              <ArrowDownTrayIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Export</span>
            </button>

            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {showStats && <ActivityLogStats stats={stats} />}

        {/* Filters Panel */}
        {showFilters && (
          <ActivityLogFilters
            filters={filters}
            onFilterChange={setFilters}
            onClearFilters={clearFilters}
            hasActiveFilters={!!hasActiveFilters}
          />
        )}
      </section>

      {/* Activity Logs List (Scrollable) */}
      <section className="flex-1 overflow-y-auto bg-gray-100 px-6 py-6">
        {/* Card View */}
        {viewMode === 'card' && (
          <div className="columns-4 gap-4 space-y-4">
            {filteredLogs.map((log) => (
              <ActivityLogCard key={log.id} log={log} onClick={setSelectedLog} />
            ))}
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="h-full">
            <ActivityLogTable logs={filteredLogs} onLogClick={setSelectedLog} />
          </div>
        )}

        {/* Empty State */}
        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No activity logs found</p>
            {hasActiveFilters && (
              <button 
                onClick={clearFilters}
                className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </section>

      {/* Detail Modal */}
      <ActivityLogDetail log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  )
}
