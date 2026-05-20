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
  | 'ARCHIVE_GENERATED'
  | 'ARCHIVE_DELETED'

export type ActivityCategory =
  | 'AUTH'
  | 'SALES'
  | 'INVENTORY'
  | 'MENU'
  | 'STAFF'
  | 'FINANCIAL'
  | 'SYSTEM'
  | 'REPORT'
  | 'REWARD'

export type UserRole = 'owner' | 'manager' | 'staff' | 'cashier'

export type SeverityLevel = 'info' | 'warning' | 'critical'

export type ActivityValue = Record<string, unknown>

export interface ActivityLog {
  id: string
  timestamp: string

  userId: string
  userName: string
  userRole: UserRole
  userEmail?: string

  action: ActivityAction
  actionCategory: ActivityCategory
  actionDescription: string

  resourceType: string
  resourceId: string | null
  resourceName: string | null

  previousValue?: ActivityValue
  newValue?: ActivityValue
  changesSummary?: string[]

  ipAddress: string
  deviceInfo: string
  sessionId: string
  location?: string

  severity: SeverityLevel
  tags: string[]
  notes?: string

  isReversible: boolean
  relatedLogIds?: string[]
}

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

export function getSeverityIcon(severity: SeverityLevel): string {
  switch (severity) {
    case 'critical':
      return 'Critical'
    case 'warning':
      return 'Warning'
    case 'info':
      return 'Info'
    default:
      return 'Info'
  }
}

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
    year: past.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}
