// Activity Logger - Centralized logging system for all user actions
// Clean, type-safe, and reusable

import { supabase } from '../config/supabaseClient'
import { getCurrentUser } from '../utils'
import type { ActivityAction, ActivityCategory, SeverityLevel } from '../types'

// ============================================
// TYPES & INTERFACES
// ============================================

interface LogActivityParams {
  action: ActivityAction
  category: ActivityCategory
  description: string
  resourceType: string
  resourceId?: string | null
  resourceName?: string | null
  previousValue?: Record<string, any>
  newValue?: Record<string, any>
  changesSummary?: string[]
  severity?: SeverityLevel
  tags?: string[]
  notes?: string
  isReversible?: boolean
}

interface DatabaseLogEntry {
  user_id: string
  user_name: string
  user_role: string
  action: string
  action_category: string
  action_description: string
  resource_type: string
  resource_id: string | null
  resource_name: string | null
  previous_value: Record<string, any> | null
  new_value: Record<string, any> | null
  changes_summary: string[] | null
  severity: string
  tags: string[] | null
  notes: string | null
  is_reversible: boolean
  ip_address: string
  device_info: string
  session_id: string
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_IP = '0.0.0.0'
const DEFAULT_DEVICE = 'Unknown Device'
const SESSION_KEY = 'session_id'
const IP_API_URL = 'https://api.ipify.org?format=json'
const IP_FETCH_TIMEOUT = 3000 // 3 seconds

// ============================================
// MAIN LOGGING FUNCTION
// ============================================

/**
 * Log user activity to database
 * @param params - Activity parameters
 * @returns Promise<void>
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    // Get current user info
    const user = getCurrentUser()
    if (!user) {
      console.warn('Activity logger: No user found, skipping log')
      return
    }

    // Capture context asynchronously (don't block)
    const [ipAddress, deviceInfo, sessionId] = await Promise.all([
      getClientIP(),
      Promise.resolve(getDeviceInfo()),
      Promise.resolve(getSessionId())
    ])

    // Build database entry
    const logEntry: DatabaseLogEntry = {
      // User info
      user_id: user.id,
      user_name: user.name,
      user_role: user.role,
      
      // Action info
      action: params.action,
      action_category: params.category,
      action_description: params.description,
      
      // Resource info
      resource_type: params.resourceType,
      resource_id: params.resourceId || null,
      resource_name: params.resourceName || null,
      
      // Changes
      previous_value: params.previousValue || null,
      new_value: params.newValue || null,
      changes_summary: params.changesSummary || null,
      
      // Context
      ip_address: ipAddress,
      device_info: deviceInfo,
      session_id: sessionId,
      
      // Metadata
      severity: params.severity || 'info',
      tags: params.tags || null,
      notes: params.notes || null,
      is_reversible: params.isReversible ?? false
    }

    // Insert to database
    const { error } = await supabase
      .from('activity_logs')
      .insert(logEntry)

    if (error) {
      throw error
    }

  } catch (error) {
    // Log error but don't throw - logging should never break user flow
    console.error('Failed to log activity:', error)
    console.error('Activity params:', params)
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get client IP address
 * Falls back to default if fetch fails or times out
 */
async function getClientIP(): Promise<string> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), IP_FETCH_TIMEOUT)

    const response = await fetch(IP_API_URL, {
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error('IP fetch failed')
    }

    const data = await response.json()
    return data.ip || DEFAULT_IP

  } catch (error) {
    // Silent fail - IP is not critical
    return DEFAULT_IP
  }
}

/**
 * Get device information from user agent
 * Format: "Browser Version / OS"
 */
function getDeviceInfo(): string {
  try {
    if (typeof navigator === 'undefined') {
      return DEFAULT_DEVICE
    }

    const ua = navigator.userAgent

    // Extract browser
    let browser = 'Unknown Browser'
    if (ua.includes('Chrome') && !ua.includes('Edg')) {
      const match = ua.match(/Chrome\/(\d+)/)
      browser = match ? `Chrome ${match[1]}` : 'Chrome'
    } else if (ua.includes('Firefox')) {
      const match = ua.match(/Firefox\/(\d+)/)
      browser = match ? `Firefox ${match[1]}` : 'Firefox'
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      const match = ua.match(/Version\/(\d+)/)
      browser = match ? `Safari ${match[1]}` : 'Safari'
    } else if (ua.includes('Edg')) {
      const match = ua.match(/Edg\/(\d+)/)
      browser = match ? `Edge ${match[1]}` : 'Edge'
    }

    // Extract OS
    let os = 'Unknown OS'
    if (ua.includes('Windows NT 10.0')) {
      os = 'Windows 10'
    } else if (ua.includes('Windows NT 11.0')) {
      os = 'Windows 11'
    } else if (ua.includes('Windows')) {
      os = 'Windows'
    } else if (ua.includes('Mac OS X')) {
      os = 'macOS'
    } else if (ua.includes('Linux')) {
      os = 'Linux'
    } else if (ua.includes('Android')) {
      os = 'Android'
    } else if (ua.includes('iOS')) {
      os = 'iOS'
    }

    return `${browser} / ${os}`

  } catch (error) {
    return DEFAULT_DEVICE
  }
}

/**
 * Get or create session ID
 * Persists in localStorage for session tracking
 */
function getSessionId(): string {
  try {
    if (typeof localStorage === 'undefined') {
      return generateSessionId()
    }

    // Try to get existing session ID
    let sessionId = localStorage.getItem(SESSION_KEY)

    // Generate new one if not exists
    if (!sessionId) {
      sessionId = generateSessionId()
      localStorage.setItem(SESSION_KEY, sessionId)
    }

    return sessionId

  } catch (error) {
    // If localStorage fails, generate temporary ID
    return generateSessionId()
  }
}

/**
 * Generate unique session ID
 * Format: sess-{timestamp}-{random}
 */
function generateSessionId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 11)
  return `sess-${timestamp}-${random}`
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Build changes summary from old and new values
 * Useful for automatically generating change descriptions
 */
export function buildChangesSummary(
  oldValue: Record<string, any>,
  newValue: Record<string, any>
): string[] {
  const changes: string[] = []

  // Get all unique keys
  const allKeys = new Set([
    ...Object.keys(oldValue || {}),
    ...Object.keys(newValue || {})
  ])

  allKeys.forEach(key => {
    const oldVal = oldValue?.[key]
    const newVal = newValue?.[key]

    // Skip if values are the same
    if (JSON.stringify(oldVal) === JSON.stringify(newVal)) {
      return
    }

    // Format change description
    if (oldVal === undefined) {
      changes.push(`${key}: Added "${newVal}"`)
    } else if (newVal === undefined) {
      changes.push(`${key}: Removed "${oldVal}"`)
    } else {
      changes.push(`${key}: "${oldVal}" → "${newVal}"`)
    }
  })

  return changes
}

/**
 * Format currency for change descriptions
 */
export function formatCurrencyChange(oldPrice: number, newPrice: number): string {
  const format = (val: number) => `Rp ${val.toLocaleString('id-ID')}`
  return `Price: ${format(oldPrice)} → ${format(newPrice)}`
}

/**
 * Format stock change description
 */
export function formatStockChange(
  oldStock: number,
  newStock: number,
  unit: string
): string {
  const diff = newStock - oldStock
  const sign = diff > 0 ? '+' : ''
  return `Stock: ${oldStock}${unit} → ${newStock}${unit} (${sign}${diff}${unit})`
}
