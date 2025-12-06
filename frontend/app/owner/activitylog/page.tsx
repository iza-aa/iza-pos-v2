'use client'

import { useState, useMemo } from 'react'
import { 
  EyeIcon, 
  EyeSlashIcon,
  FunnelIcon,
  ArrowDownTrayIcon
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
  ActivityLogDetail,
  ActivityLogHeader,
  DateFilterDropdown,
  ActivityLogEmpty
} from '@/app/components/owner/activitylog'
import { SearchBar, ViewModeToggle } from '@/app/components/ui'
import type { DateFilterType } from '@/app/components/owner/activitylog/DateFilterDropdown'
import type { ViewMode } from '@/app/components/ui/ViewModeToggle'

export default function ActivityLogPage() {
  const [logs] = useState<ActivityLog[]>(activityLogs)
  const [showStats, setShowStats] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all')
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

  return (
    <div className="h-[calc(100vh-55px)] flex flex-col overflow-hidden">
      {/* Header + Stats */}
      <section className="flex-shrink-0 p-6 bg-white border-b border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between">
          <ActivityLogHeader 
            title="Activity Logs"
            description="Track all system activities and user actions"
          />

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
            <DateFilterDropdown
              dateFilter={dateFilter}
              onDateFilterChange={setDateFilter}
              customDateRange={customDateRange}
              onCustomDateRangeChange={setCustomDateRange}
            />

            {/* View Mode Toggle */}
            <ViewModeToggle
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />

            {/* Toggle Filters */}
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 h-[42px] px-4 border rounded-xl transition ${
                showFilters 
                  ? 'bg-gray-800 border-gray-800 text-white' 
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <FunnelIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Filters</span>
              {hasActiveFilters && (
                <span className="bg-white text-gray-800 text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                  {[filters.severity, filters.category, filters.userRole, filters.action, searchQuery].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Export Button */}
            <button className="flex items-center gap-2 h-[42px] px-4 bg-black text-white rounded-xl hover:bg-gray-800 transition">
              <ArrowDownTrayIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Export</span>
            </button>

            {/* Search */}
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search activities..."
              width="w-64"
            />
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
          <ActivityLogEmpty
            hasFilters={!!hasActiveFilters}
            onClearFilters={clearFilters}
          />
        )}
      </section>

      {/* Detail Modal */}
      <ActivityLogDetail log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  )
}
