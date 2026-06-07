'use client'

import {
  ArrowRightIcon,
  ClockIcon,
  ComputerDesktopIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'
import type { ActivityLog } from '@/lib/types/activity'

interface ActivityLogCardProps {
  log: ActivityLog
  onClick?: (log: ActivityLog) => void
}

type SeverityMeta = {
  label: string
  icon: typeof InformationCircleIcon
  iconBoxClass: string
  badgeClass: string
  accentClass: string
}

const severityMap: Record<ActivityLog['severity'], SeverityMeta> = {
  info: {
    label: 'Info',
    icon: InformationCircleIcon,
    iconBoxClass: 'border-gray-200 bg-gray-50 text-gray-700',
    badgeClass: 'border-gray-200 bg-gray-50 text-gray-700',
    accentClass: 'bg-gray-300',
  },
  warning: {
    label: 'Warning',
    icon: ExclamationCircleIcon,
    iconBoxClass: 'border-red-200 bg-red-50 text-red-700',
    badgeClass: 'border-red-200 bg-red-50 text-red-700',
    accentClass: 'bg-red-400',
  },
  critical: {
    label: 'Critical',
    icon: ExclamationCircleIcon,
    iconBoxClass: 'border-red-200 bg-red-50 text-red-700',
    badgeClass: 'border-red-200 bg-red-50 text-red-700',
    accentClass: 'bg-red-500',
  },
}

const formatRole = (role: string) => {
  if (!role) return 'Unknown'
  return role.charAt(0).toUpperCase() + role.slice(1)
}

const formatLabel = (value: string) => {
  if (!value) return 'Unknown'

  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}


const hasExplicitTimezone = (value: string) => /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value.trim())

/**
 * Supabase/Postgres `timestamp without time zone` often comes as:
 * "2026-05-18 07:30:00"
 *
 * In this project it should be treated as UTC, because the DB stores UTC time.
 * Without this normalization, browsers in WIB/UTC+7 can display fresh logs as
 * "7 hours ago".
 */
const parseActivityTimestamp = (timestamp: string) => {
  if (!timestamp) return null

  const normalized = timestamp.trim().replace(' ', 'T')
  const timestampWithTimezone = hasExplicitTimezone(normalized) ? normalized : `${normalized}Z`
  const date = new Date(timestampWithTimezone)

  if (Number.isNaN(date.getTime())) return null

  return date
}

const formatActivityTimeAgo = (timestamp: string) => {
  const date = parseActivityTimestamp(timestamp)

  if (!date) return timestamp

  const diffMs = Date.now() - date.getTime()
  const absDiffMs = Math.abs(diffMs)
  const seconds = Math.floor(absDiffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  const suffix = diffMs >= 0 ? 'ago' : 'from now'

  if (seconds < 10) return 'just now'
  if (seconds < 60) return `${seconds} seconds ${suffix}`
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ${suffix}`
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ${suffix}`
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ${suffix}`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const formatDateTime = (timestamp: string) => {
  const date = parseActivityTimestamp(timestamp)

  if (!date) return timestamp

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getResourceLabel = (log: ActivityLog) => {
  const type = log.resourceType || 'Resource'
  const name = log.resourceName || log.resourceId

  if (!name) return type

  return `${type}: ${name}`
}

const getChangesPreview = (log: ActivityLog) => {
  const changes = log.changesSummary ?? []

  if (changes.length > 0) {
    return changes.slice(0, 2)
  }

  if (log.notes) {
    return [log.notes]
  }

  return []
}

export default function ActivityLogCard({ log, onClick }: ActivityLogCardProps) {
  const severity = severityMap[log.severity] ?? severityMap.info
  const SeverityIcon = severity.icon
  const changesPreview = getChangesPreview(log)
  const shouldShowDevice = log.severity === 'critical' || log.deviceInfo !== 'Unknown Device'

  return (
    <button
      type="button"
      onClick={() => onClick?.(log)}
      className="group relative flex w-full flex-col rounded-lg border border-gray-200 bg-white text-left transition hover:border-gray-300 hover:bg-gray-50/60"
    >
      <span className={`absolute left-0 top-4 h-10 w-1 rounded-r-full ${severity.accentClass}`} />

      <div className="flex gap-4 p-5">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${severity.iconBoxClass}`}
        >
          <SeverityIcon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${severity.badgeClass}`}
            >
              {severity.label}
            </span>
            <span className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-600">
              {formatLabel(log.actionCategory)}
            </span>
            <span className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-600">
              {formatLabel(log.action)}
            </span>
          </div>

          <h3 className="line-clamp-2 text-sm font-bold leading-6 text-gray-950">
            {log.actionDescription}
          </h3>

          <div className="mt-3 grid gap-2 text-sm text-gray-500">
            <div className="flex min-w-0 items-center gap-2">
              <UserCircleIcon className="h-4 w-4 shrink-0 text-gray-400" />
              <span className="truncate">
                <span className="font-medium text-gray-700">{log.userName}</span>
                <span className="text-gray-400"> · </span>
                {formatRole(log.userRole)}
              </span>
            </div>

            <div className="flex min-w-0 items-center gap-2">
              <ShieldCheckIcon className="h-4 w-4 shrink-0 text-gray-400" />
              <span className="truncate">{getResourceLabel(log)}</span>
            </div>

            <div className="flex min-w-0 items-center gap-2">
              <ClockIcon className="h-4 w-4 shrink-0 text-gray-400" />
              <span className="truncate" title={formatDateTime(log.timestamp)}>
                {formatActivityTimeAgo(log.timestamp)}
              </span>
            </div>
          </div>

          {changesPreview.length > 0 ? (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Summary
              </p>
              <div className="space-y-1">
                {changesPreview.map((change, index) => (
                  <p key={`${log.id}-change-${index}`} className="line-clamp-1 text-xs text-gray-600">
                    {change}
                  </p>
                ))}
                {(log.changesSummary?.length ?? 0) > 2 ? (
                  <p className="text-xs font-medium text-gray-500">
                    +{(log.changesSummary?.length ?? 0) - 2} more changes
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
        <div className="flex min-w-0 items-center gap-2">
          {shouldShowDevice ? (
            <>
              <ComputerDesktopIcon className="h-4 w-4 shrink-0 text-gray-400" />
              <span className="truncate">{log.deviceInfo}</span>
            </>
          ) : (
            <span>{formatDateTime(log.timestamp)}</span>
          )}
        </div>

        <ArrowRightIcon className="h-4 w-4 shrink-0 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-gray-700" />
      </div>
    </button>
  )
}
