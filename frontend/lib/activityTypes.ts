// Activity Log System - Type Definitions

export type ActivityAction = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'LOGIN' 
  | 'LOGOUT'
  | 'VOID'
  | 'REFUND'
  | 'VIEW'
  | 'EXPORT'
  | 'ADJUST'

export type ActivityCategory = 
  | 'AUTH'           // Authentication & Authorization
  | 'SALES'          // Sales transactions
  | 'INVENTORY'      // Inventory management
  | 'MENU'           // Menu management
  | 'STAFF'          // Staff management
  | 'FINANCIAL'      // Financial operations
  | 'SYSTEM'         // System operations
  | 'REPORT'         // Reports & exports

export type UserRole = 'owner' | 'manager' | 'staff' | 'cashier'

export type SeverityLevel = 'info' | 'warning' | 'critical'

export interface ActivityLog {
  // Identifiers
  id: string
  timestamp: string
  
  // Actor (Who)
  userId: string
  userName: string
  userRole: UserRole
  userEmail?: string
  
  // Action (What)
  action: ActivityAction
  actionCategory: ActivityCategory
  actionDescription: string
  
  // Target (Where/What Resource)
  resourceType: string              // 'order' | 'product' | 'inventory' | 'user' | 'menu' | 'shift'
  resourceId: string | null
  resourceName: string | null
  
  // Changes (Before/After)
  previousValue?: Record<string, any>
  newValue?: Record<string, any>
  changesSummary?: string[]         // ["price: 10000 → 12000", "stock: 50 → 45"]
  
  // Context
  ipAddress: string
  deviceInfo: string
  sessionId: string
  location?: string
  
  // Metadata
  severity: SeverityLevel
  tags: string[]
  notes?: string
  
  // Audit Trail
  isReversible: boolean
  relatedLogIds?: string[]
}

// Filter options for activity log
export interface ActivityLogFilters {
  userId?: string
  userRole?: UserRole
  action?: ActivityAction
  category?: ActivityCategory
  severity?: SeverityLevel
  resourceType?: string
  dateFrom?: string
  dateTo?: string
  searchQuery?: string
}

// Stats for activity log page
export interface ActivityLogStats {
  totalLogs: number
  todayLogs: number
  criticalActions: number
  uniqueUsers: number
  topUser: {
    name: string
    count: number
  }
  topAction: {
    name: string
    count: number
  }
}

// Helper function to get severity color
export function getSeverityColor(severity: SeverityLevel): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-700 border-red-200'
    case 'warning':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    case 'info':
      return 'bg-blue-100 text-blue-700 border-blue-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

// Helper function to get severity icon
export function getSeverityIcon(severity: SeverityLevel): string {
  switch (severity) {
    case 'critical':
      return '🔴'
    case 'warning':
      return '🟡'
    case 'info':
      return '🟢'
    default:
      return '⚪'
  }
}

// Helper function to get category color
export function getCategoryColor(category: ActivityCategory): string {
  switch (category) {
    case 'AUTH':
      return 'bg-purple-100 text-purple-700'
    case 'SALES':
      return 'bg-green-100 text-green-700'
    case 'INVENTORY':
      return 'bg-orange-100 text-orange-700'
    case 'MENU':
      return 'bg-blue-100 text-blue-700'
    case 'STAFF':
      return 'bg-pink-100 text-pink-700'
    case 'FINANCIAL':
      return 'bg-emerald-100 text-emerald-700'
    case 'SYSTEM':
      return 'bg-gray-100 text-gray-700'
    case 'REPORT':
      return 'bg-indigo-100 text-indigo-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

// Helper function to format time ago
export function formatTimeAgo(timestamp: string): string {
  const now = new Date()
  const past = new Date(timestamp)
  const diffMs = now.getTime() - past.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  
  return past.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: past.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
  })
}
