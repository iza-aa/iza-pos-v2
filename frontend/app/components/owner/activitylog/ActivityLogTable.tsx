'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { ActivityLog, formatTimeAgo } from '@/lib/types'
import { parseSupabaseTimestamp, formatJakartaTime } from '@/lib/utils'
import { POLLING_INTERVALS } from '@/lib/constants'

interface ActivityLogTableProps {
  logs: ActivityLog[]
  onLogClick: (log: ActivityLog) => void
}

const getSeverityConfig = (severity: string) => {
  const normalized = severity.toLowerCase()

  if (normalized === 'critical' || normalized === 'error') {
    return {
      label: normalized === 'critical' ? 'Critical' : 'Error',
      icon: XCircleIcon,
      className: 'bg-red-50 text-red-700 border-red-200',
    }
  }

  if (normalized === 'warning') {
    return {
      label: 'Warning',
      icon: ExclamationTriangleIcon,
      className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    }
  }

  return {
    label: 'Info',
    icon: InformationCircleIcon,
    className: 'bg-gray-100 text-gray-700 border-gray-200',
  }
}

const formatCategory = (category: string) =>
  category
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')

function TimeCell({ timestamp }: { timestamp: string }) {
  const [timeAgo, setTimeAgo] = useState('')

  useEffect(() => {
    setTimeAgo(formatTimeAgo(timestamp))
    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(timestamp))
    }, POLLING_INTERVALS.SLOW)
    return () => clearInterval(interval)
  }, [timestamp])

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
        <ClockIcon className="h-4 w-4 text-gray-400" />
        <span>{timeAgo || 'Loading...'}</span>
      </div>
      <p className="mt-1 text-xs text-gray-500">{formatJakartaTime(parseSupabaseTimestamp(timestamp))}</p>
    </div>
  )
}

export default function ActivityLogTable({ logs, onLogClick }: ActivityLogTableProps) {
  const rows = useMemo(() => logs, [logs])

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[1100px] table-fixed">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr className="border-b border-gray-200">
              <th className="w-[17%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Event</th>
              <th className="w-[25%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Description</th>
              <th className="w-[16%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">User</th>
              <th className="w-[18%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Resource</th>
              <th className="w-[14%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Changes</th>
              <th className="w-[10%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.map((log) => {
              const severity = getSeverityConfig(log.severity)
              const SeverityIcon = severity.icon
              const changesSummary = log.changesSummary ?? []

              return (
                <tr
                  key={log.id}
                  onClick={() => onLogClick(log)}
                  className="cursor-pointer transition hover:bg-gray-50"
                >
                  <td className="px-4 py-4 align-top">
                    <div className="flex min-w-0 flex-col gap-2">
                      <span className={`inline-flex w-fit items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold ${severity.className}`}>
                        <SeverityIcon className="h-4 w-4" />
                        {severity.label}
                      </span>
                      <span className="inline-flex w-fit rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600">
                        {formatCategory(log.actionCategory)}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <p className="line-clamp-2 text-sm font-semibold text-gray-900">{log.actionDescription}</p>
                    <p className="mt-1 text-xs text-gray-500">{log.action}</p>
                    {log.notes ? <p className="mt-2 line-clamp-1 text-xs text-gray-500">{log.notes}</p> : null}
                  </td>

                  <td className="px-4 py-4 align-top">
                    <div className="flex min-w-0 items-start gap-2">
                      <UserCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{log.userName}</p>
                        <p className="text-xs capitalize text-gray-500">{log.userRole}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4 align-top">
                    {log.resourceName ? (
                      <div className="flex min-w-0 items-start gap-2">
                        <ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">{log.resourceName}</p>
                          <p className="text-xs text-gray-500">{log.resourceType}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>

                  <td className="px-4 py-4 align-top">
                    {changesSummary.length > 0 ? (
                      <div className="min-w-0">
                        <p className="line-clamp-1 text-sm text-gray-700">{changesSummary[0]}</p>
                        {changesSummary.length > 1 ? (
                          <p className="mt-1 text-xs font-medium text-gray-500">+{changesSummary.length - 1} more</p>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>

                  <td className="px-4 py-4 align-top">
                    <TimeCell timestamp={log.timestamp} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}