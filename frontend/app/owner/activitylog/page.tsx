'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { 
  EyeIcon, 
  EyeSlashIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'
import { showError, showWarning } from '@/lib/errorHandling'
import { shouldShowArchiveReminder } from '@/lib/archiveService'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { 
  ActivityLog, 
  ActivityLogFilters as Filters,
  ActivityAction,
  ActivityCategory,
  SeverityLevel,
  UserRole
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
import { ArchiveBanner } from '@/app/components/owner/archives'
import { SearchBar, ViewModeToggle } from '@/app/components/ui'
import type { DateFilterType } from '@/app/components/owner/activitylog/DateFilterDropdown'
import type { ViewMode } from '@/app/components/ui/Form/ViewModeToggle'

// Transform database log (snake_case) to TypeScript interface (camelCase)
function transformLog(dbLog: any): ActivityLog {
  return {
    id: dbLog.id,
    timestamp: dbLog.timestamp,
    userId: dbLog.user_id,
    userName: dbLog.user_name,
    userRole: dbLog.user_role as UserRole,
    userEmail: dbLog.user_email,
    action: dbLog.action as ActivityAction,
    actionCategory: dbLog.action_category as ActivityCategory,
    actionDescription: dbLog.action_description,
    resourceType: dbLog.resource_type,
    resourceId: dbLog.resource_id,
    resourceName: dbLog.resource_name,
    previousValue: dbLog.previous_value,
    newValue: dbLog.new_value,
    changesSummary: dbLog.changes_summary || [],
    ipAddress: dbLog.ip_address || '',
    deviceInfo: dbLog.device_info || '',
    sessionId: dbLog.session_id || '',
    location: dbLog.location,
    severity: dbLog.severity as SeverityLevel,
    tags: dbLog.tags || [],
    notes: dbLog.notes,
    isReversible: dbLog.is_reversible,
    relatedLogIds: dbLog.related_log_ids
  }
}

// Pagination constants
const LOGS_PER_PAGE = 50

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
  const [showExportDropdown, setShowExportDropdown] = useState(false)
  const exportDropdownRef = useRef<HTMLDivElement>(null)
  const [staffUsers, setStaffUsers] = useState<Array<{ id: string, name: string, role: UserRole }>>([])
  const [showArchiveBanner, setShowArchiveBanner] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  
  // Filters
  const [filters, setFilters] = useState<Filters>({
    severity: undefined,
    category: undefined,
    userRole: undefined,
    action: undefined,
    userId: undefined
  })

  // Check if archive reminder should be shown
  useEffect(() => {
    setShowArchiveBanner(shouldShowArchiveReminder())
  }, [])

  // Fetch staff users from database
  const fetchStaffUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('id, name, staff_type')
        .order('name')
      
      if (error) throw error
      
      const users = data.map(staff => ({
        id: staff.id,
        name: staff.name,
        role: (staff.staff_type === 'manager' ? 'manager' : 'staff') as UserRole
      }))
      
      // Add owner (from database or hardcoded)
      const { data: ownerData } = await supabase
        .from('owner')
        .select('id, name')
        .single()
      
      if (ownerData) {
        users.unshift({
          id: ownerData.id,
          name: ownerData.name,
          role: 'owner' as UserRole
        })
      }
      
      setStaffUsers(users)
    } catch (err) {
      console.error('Error fetching staff users:', err)
    }
  }

  // Fetch activity logs from Supabase
  const fetchActivityLogs = async (reset = true) => {
    try {
      if (reset) {
        setLoading(true)
        setCurrentPage(0)
      } else {
        setLoadingMore(true)
      }
      setError(null)
      
      const page = reset ? 0 : currentPage + 1
      const from = page * LOGS_PER_PAGE
      const to = from + LOGS_PER_PAGE - 1
      
      // Get total count (only on initial load)
      if (reset) {
        const { count } = await supabase
          .from('activity_logs')
          .select('*', { count: 'exact', head: true })
        
        setTotalCount(count || 0)
      }
      
      // Fetch paginated data
      const { data, error: fetchError } = await supabase
        .from('activity_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .range(from, to)
      
      if (fetchError) throw fetchError
      
      const transformedLogs = (data || []).map(transformLog)
      
      if (reset) {
        setLogs(transformedLogs)
      } else {
        setLogs(prev => [...prev, ...transformedLogs])
        setCurrentPage(page)
      }
      
      // Check if there are more logs to load
      setHasMore(transformedLogs.length === LOGS_PER_PAGE)
      
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load activity logs'
      setError(errorMessage)
      showError(errorMessage)
      console.error('Error fetching activity logs:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }
  
  // Load more logs
  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchActivityLogs(false)
    }
  }

  // Export to CSV
  const exportToCSV = () => {
    try {
      // CSV Headers
      const headers = ['Timestamp', 'User', 'Role', 'Action', 'Category', 'Description', 'Resource', 'Severity']
      
      // Map filtered logs to CSV rows
      const rows = filteredLogs.map(log => [
        new Date(log.timestamp).toLocaleString('id-ID'),
        log.userName,
        log.userRole,
        log.action,
        log.actionCategory,
        log.actionDescription,
        log.resourceName || log.resourceType || '-',
        log.severity
      ])
      
      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      const filename = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`
      
      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      showError('Failed to export CSV')
      console.error('CSV export error:', err)
    }
  }

  // Export to PDF
  const exportToPDF = () => {
    try {
      const doc = new jsPDF()
      
      // Add title
      doc.setFontSize(16)
      doc.text('Activity Logs Report', 14, 15)
      
      // Add generation date
      doc.setFontSize(10)
      doc.text(`Generated: ${new Date().toLocaleString('id-ID')}`, 14, 22)
      doc.text(`Total Records: ${filteredLogs.length}`, 14, 28)
      
      // Prepare table data
      const tableData = filteredLogs.map(log => [
        new Date(log.timestamp).toLocaleString('id-ID', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        log.userName,
        log.userRole,
        log.action,
        log.actionCategory,
        log.actionDescription.length > 40 
          ? log.actionDescription.substring(0, 37) + '...' 
          : log.actionDescription,
        log.severity
      ])
      
      // Generate table
      autoTable(doc, {
        head: [['Timestamp', 'User', 'Role', 'Action', 'Category', 'Description', 'Severity']],
        body: tableData,
        startY: 35,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: 14, right: 14 }
      })
      
      // Save PDF
      const filename = `activity-logs-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(filename)
    } catch (err) {
      showError('Failed to export PDF')
      console.error('PDF export error:', err)
    }
  }

  // Fetch logs and staff users on mount
  useEffect(() => {
    fetchActivityLogs(true)
    fetchStaffUsers()
  }, [])

  // Real-time subscription for activity logs
  useEffect(() => {
    const channel = supabase
      .channel('activity_logs_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs'
        },
        (payload) => {
          const newLog = transformLog(payload.new)
          
          // Prepend new log to the state
          setLogs(prev => [newLog, ...prev])
          
          // Update total count
          setTotalCount(prev => prev + 1)
          
          // Show toast notification for critical events
          if (newLog.severity === 'critical') {
            showWarning(
              `🚨 Critical Activity: ${newLog.userName} - ${newLog.actionDescription}`,
              5000
            )
          }
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false)
      }
    }

    if (showExportDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showExportDropdown])

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
      
      // User ID filter
      if (filters.userId && log.userId !== filters.userId) return false
      
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

  const hasActiveFilters = searchQuery || filters.severity || filters.category || filters.userRole || filters.action || filters.userId

  return (
    <div className="h-[calc(100vh-55px)] flex flex-col overflow-hidden">
      {/* Header + Stats */}
      <section className="flex-shrink-0 p-4 md:p-6 bg-white border-b border-gray-200">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <ActivityLogHeader 
            title="Activity Logs"
            description="Track all system activities and user actions"
          />

          <div className="flex items-center gap-2 md:gap-3 justify-start lg:justify-end">
            {/* Toggle Stats */}
            <button 
              onClick={() => setShowStats(!showStats)}
              className="flex items-center justify-center h-[38px] md:h-[42px] w-9 md:w-10 border border-gray-300 rounded-xl hover:bg-gray-50 transition flex-shrink-0"
              title={showStats ? "Hide Statistics" : "Show Statistics"}
            >
              {showStats ? (
                <EyeSlashIcon className="w-4 md:w-5 h-4 md:h-5 text-gray-600" />
              ) : (
                <EyeIcon className="w-4 md:w-5 h-4 md:h-5 text-gray-600" />
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
              className={`flex items-center gap-2 h-[38px] md:h-[42px] px-3 md:px-4 border rounded-xl transition flex-shrink-0 ${
                showFilters 
                  ? 'bg-gray-800 border-gray-800 text-white' 
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <FunnelIcon className="w-4 md:w-5 h-4 md:h-5" />
              <span className="text-xs md:text-sm font-medium hidden sm:inline">Filters</span>
              {hasActiveFilters && (
                <span className="bg-white text-gray-800 text-[10px] md:text-xs rounded-full w-4 md:w-5 h-4 md:h-5 flex items-center justify-center font-semibold">
                  {[filters.severity, filters.category, filters.userRole, filters.action, searchQuery].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Export Button with Dropdown */}
            <div className="relative" ref={exportDropdownRef}>
              <button 
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="flex items-center gap-2 h-[38px] md:h-[42px] px-3 md:px-4 bg-black text-white rounded-xl hover:bg-gray-800 transition flex-shrink-0"
              >
                <ArrowDownTrayIcon className="w-4 md:w-5 h-4 md:h-5" />
                <span className="text-xs md:text-sm font-medium hidden sm:inline">Export</span>
                <ChevronDownIcon className="w-3 md:w-4 h-3 md:h-4" />
              </button>

              {/* Export Dropdown Menu */}
              {showExportDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
                  <button
                    onClick={() => {
                      exportToCSV()
                      setShowExportDropdown(false)
                    }}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 rounded-t-xl transition flex items-center gap-2"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    Export as CSV
                  </button>
                  <button
                    onClick={() => {
                      exportToPDF()
                      setShowExportDropdown(false)
                    }}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 rounded-b-xl transition flex items-center gap-2 border-t border-gray-100"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    Export as PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar - Left aligned on mobile, right aligned on tablet+ */}
        <div className="flex justify-start lg:justify-end lg:hidden">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search activities..."
            width="w-full sm:w-auto"
          />
        </div>
      </div>
      
        {/* Archive Banner */}
        {showArchiveBanner && (
          <ArchiveBanner onDismiss={() => setShowArchiveBanner(false)} />
        )}
        
        {/* Stats Cards */}
        {showStats && <ActivityLogStats stats={stats} />}

        {/* Filters Panel */}
        {showFilters && (
          <ActivityLogFilters
            filters={filters}
            onFilterChange={setFilters}
            onClearFilters={clearFilters}
            hasActiveFilters={!!hasActiveFilters}
            uniqueUsers={staffUsers}
          />
        )}
      </section>

      {/* Activity Logs List (Scrollable) */}
      <section className="flex-1 overflow-y-auto bg-gray-100 px-4 md:px-6 py-4 md:py-6">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            <p className="text-sm text-gray-600">Loading activity logs...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 max-w-md mx-auto text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-3xl">⚠️</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Activity Logs</h3>
              <p className="text-sm text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => fetchActivityLogs(true)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Data Loaded - Card View */}
        {!loading && !error && viewMode === 'card' && (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3 md:gap-4 space-y-3 md:space-y-4">
            {filteredLogs.map((log) => (
              <ActivityLogCard key={log.id} log={log} onClick={setSelectedLog} />
            ))}
          </div>
        )}

        {/* Data Loaded - Table View */}
        {!loading && !error && viewMode === 'table' && (
          <div className="h-full">
            <ActivityLogTable logs={filteredLogs} onLogClick={setSelectedLog} />
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredLogs.length === 0 && (
          <ActivityLogEmpty
            hasFilters={!!hasActiveFilters}
            onClearFilters={clearFilters}
          />
        )}
        
        {/* Pagination Info & Load More */}
        {!loading && !error && logs.length > 0 && (
          <div className="mt-6 flex flex-col items-center gap-4 pb-6">
            {/* Pagination Info */}
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{logs.length}</span> of{' '}
              <span className="font-semibold text-gray-900">{totalCount}</span> logs
            </div>
            
            {/* Load More Button */}
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm flex items-center gap-2"
              >
                {loadingMore ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Loading...
                  </>
                ) : (
                  <>
                    Load More
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded">+{LOGS_PER_PAGE}</span>
                  </>
                )}
              </button>
            )}
            
            {/* All Loaded Message */}
            {!hasMore && logs.length < totalCount && (
              <p className="text-sm text-gray-500 italic">All logs loaded</p>
            )}
          </div>
        )}
      </section>

      {/* Detail Modal */}
      <ActivityLogDetail log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  )
}
