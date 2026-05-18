// Activity Logger - Centralized logging system for all user actions
// Clean, type-safe, and reusable

import { supabase } from '../../config/supabaseClient'
import { getCurrentUser } from '../../utils'
import type { ActivityAction, ActivityCategory, SeverityLevel, ActivityValue } from '../../types'

interface LogActivityParams {
  action: ActivityAction
  category: ActivityCategory
  description: string
  resourceType: string
  resourceId?: string | null
  resourceName?: string | null
  previousValue?: ActivityValue
  newValue?: ActivityValue
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
  previous_value: ActivityValue | null
  new_value: ActivityValue | null
  changes_summary: string[] | null
  severity: string
  tags: string[] | null
  notes: string | null
  is_reversible: boolean
  ip_address: string
  device_info: string
  session_id: string
}

type IpApiResponse = {
  ip?: string
}

const DEFAULT_IP = '0.0.0.0'
const DEFAULT_DEVICE = 'Unknown Device'
const SESSION_KEY = 'session_id'
const IP_API_URL = 'https://api.ipify.org?format=json'
const IP_FETCH_TIMEOUT = 3000

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const user = getCurrentUser()
    if (!user) {
      console.warn('Activity logger: No user found, skipping log')
      return
    }

    const [ipAddress, deviceInfo, sessionId] = await Promise.all([
      getClientIP(),
      Promise.resolve(getDeviceInfo()),
      Promise.resolve(getSessionId()),
    ])

    const logEntry: DatabaseLogEntry = {
      user_id: user.id,
      user_name: user.name,
      user_role: user.role,
      action: params.action,
      action_category: params.category,
      action_description: params.description,
      resource_type: params.resourceType,
      resource_id: params.resourceId || null,
      resource_name: params.resourceName || null,
      previous_value: params.previousValue || null,
      new_value: params.newValue || null,
      changes_summary: params.changesSummary || null,
      ip_address: ipAddress,
      device_info: deviceInfo,
      session_id: sessionId,
      severity: params.severity || 'info',
      tags: params.tags || null,
      notes: params.notes || null,
      is_reversible: params.isReversible ?? false,
    }

    const { error } = await supabase.from('activity_logs').insert(logEntry)

    if (error) throw error
  } catch (error) {
    console.error('Failed to log activity:', error)
    console.error('Activity params:', params)
  }
}

async function getClientIP(): Promise<string> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), IP_FETCH_TIMEOUT)

    const response = await fetch(IP_API_URL, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!response.ok) throw new Error('IP fetch failed')

    const data = (await response.json()) as IpApiResponse
    return data.ip || DEFAULT_IP
  } catch {
    return DEFAULT_IP
  }
}

function getDeviceInfo(): string {
  try {
    if (typeof navigator === 'undefined') return DEFAULT_DEVICE

    const ua = navigator.userAgent
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

    let os = 'Unknown OS'
    if (ua.includes('Windows NT 10.0')) os = 'Windows 10'
    else if (ua.includes('Windows NT 11.0')) os = 'Windows 11'
    else if (ua.includes('Windows')) os = 'Windows'
    else if (ua.includes('Mac OS X')) os = 'macOS'
    else if (ua.includes('Linux')) os = 'Linux'
    else if (ua.includes('Android')) os = 'Android'
    else if (ua.includes('iOS')) os = 'iOS'

    return `${browser} / ${os}`
  } catch {
    return DEFAULT_DEVICE
  }
}

function getSessionId(): string {
  try {
    if (typeof localStorage === 'undefined') return generateSessionId()

    let sessionId = localStorage.getItem(SESSION_KEY)
    if (!sessionId) {
      sessionId = generateSessionId()
      localStorage.setItem(SESSION_KEY, sessionId)
    }

    return sessionId
  } catch {
    return generateSessionId()
  }
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

export type { LogActivityParams }
