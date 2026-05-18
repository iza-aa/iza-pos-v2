'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRightIcon,
  ClockIcon,
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { ActivityLog, formatTimeAgo } from '@/lib/types'
import { POLLING_INTERVALS } from '@/lib/constants'
import { parseSupabaseTimestamp, formatJakartaDateTime } from '@/lib/utils'

interface ActivityLogCardProps {
  log: ActivityLog
  onClick: (log: ActivityLog) => void
}

const getSeverityConfig = (severity: string) => {
  const normalized = severity.toLowerCase()

  if (normalized === 'critical') {
    return {
      label: 'Critical',
      icon: XCircleIcon,
      badgeClass: 'bg-red-50 text-red-700 border-red-200',
      iconClass: 'bg-red-50 text-red-700 border-red-200',
    }
  }

  if (normalized === 'warning') {
    return {
      label: 'Warning',
      icon: ExclamationTriangleIcon,
      badgeClass: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      iconClass: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    }
  }

  if (normalized === 'error') {
    return {
      label: 'Error',
      icon: XCircleIcon,
      badgeClass: 'bg-red-50 text-red-700 border-red-200',
      iconClass: 'bg-red-50 text-red-700 border-red-200',
    }
  }

  return {
    label: 'Info',
    icon: InformationCircleIcon,
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
    iconClass: 'bg-gray-100 text-gray-700 border-gray-200',
  }
}

const formatCategory = (category: string) =>
  category
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')

export default function ActivityLogCard({ log, onClick }: ActivityLogCardProps) {
  const [timeAgo, setTimeAgo] = useState('')

  useEffect(() => {
    setTimeAgo(formatTimeAgo(log.timestamp))

    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(log.timestamp))
    }, POLLING_INTERVALS.SLOW)

    return () => clearInterval(interval)
  }, [log.timestamp])

  const severity = useMemo(() => getSeverityConfig(log.severity), [log.severity])
  const SeverityIcon = severity.icon
  const changesSummary = log.changesSummary ?? []

  return (
    <button
      type="button"
      onClick={() => onClick(log)}
      className="group w-full rounded-lg border border-gray-200 bg-white p-4 text-left transition hover:border-gray-300 hover:bg-gray-50"
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${severity.iconClass}`}>
          <SeverityIcon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${severity.badgeClass}`}>
              {severity.label}
            </span>
            <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600">
              {formatCategory(log.actionCategory)}
            </span>
            <span className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-500">
              {log.action}
            </span>
          </div>

          <h3 className="mt-3 line-clamp-2 text-sm font-semibold text-gray-900">
            {log.actionDescription}
          </h3>

          <div className="mt-3 grid gap-2 text-xs text-gray-600 sm:grid-cols-2">
            <div className="flex min-w-0 items-center gap-2">
              <UserCircleIcon className="h-4 w-4 shrink-0 text-gray-400" />
              <span className="truncate">
                {log.userName} · <span className="capitalize">{log.userRole}</span>
              </span>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <ClockIcon className="h-4 w-4 shrink-0 text-gray-400" />
              <span className="truncate">{timeAgo || 'Loading...'}</span>
            </div>
            {log.resourceName ? (
              <div className="flex min-w-0 items-center gap-2 sm:col-span-2">
                <ShieldCheckIcon className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="truncate">
                  {log.resourceType}: {log.resourceName}
                </span>
              </div>
            ) : null}
          </div>

          {changesSummary.length > 0 ? (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Changes</p>
              <div className="space-y-1">
                {changesSummary.slice(0, 2).map((change, index) => (
                  <p key={`${log.id}-change-${index}`} className="line-clamp-1 text-xs text-gray-700">
                    {change}
                  </p>
                ))}
                {changesSummary.length > 2 ? (
                  <p className="text-xs font-medium text-gray-500">+{changesSummary.length - 2} more changes</p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
            <div className="flex min-w-0 items-center gap-2 text-xs text-gray-500">
              <ComputerDesktopIcon className="h-4 w-4 shrink-0" />
              <span className="truncate">{log.deviceInfo || formatJakartaDateTime(parseSupabaseTimestamp(log.timestamp))}</span>
            </div>
            <ArrowRightIcon className="h-4 w-4 shrink-0 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-gray-600" />
          </div>
        </div>
      </div>
    </button>
  )
}