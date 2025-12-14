'use client'

import { useState, useEffect } from 'react'
import { ActivityLog, getSeverityIcon, getSeverityColor, getCategoryColor, formatTimeAgo } from '@/lib/types'
import { parseSupabaseTimestamp, formatJakartaTime } from '@/lib/utils'
import { POLLING_INTERVALS } from '@/lib/constants'

interface ActivityLogTableProps {
  logs: ActivityLog[]
  onLogClick: (log: ActivityLog) => void
}

function TimeAgoCell({ timestamp }: { timestamp: string }) {
  const [timeAgo, setTimeAgo] = useState<string>('')

  useEffect(() => {
    setTimeAgo(formatTimeAgo(timestamp))
    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(timestamp))
    }, POLLING_INTERVALS.SLOW)
    return () => clearInterval(interval)
  }, [timestamp])

  return (
    <td className="w-[14%] px-3 md:px-4 py-2 md:py-3 whitespace-nowrap">
      <div className="text-[10px] md:text-xs text-gray-900">{timeAgo || 'Loading...'}</div>
      <div className="text-[10px] md:text-xs text-gray-500">
        {formatJakartaTime(parseSupabaseTimestamp(timestamp))}
      </div>
    </td>
  )
}

export default function ActivityLogTable({ logs, onLogClick }: ActivityLogTableProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col h-full">
      <div className="overflow-auto flex-1">
        <table className="w-full min-w-[900px] md:min-w-[1200px] table-fixed">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr className="border-b border-gray-200">
              <th className="w-[12%] px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Severity
              </th>
              <th className="w-[12%] px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Category
              </th>
              <th className="w-[20%] px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Action
              </th>
              <th className="w-[12%] px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-700 uppercase tracking-wider">
                User
              </th>
              <th className="w-[14%] px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Resource
              </th>
              <th className="w-[16%] px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Changes
              </th>
              <th className="w-[14%] px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Time
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {logs.map((log) => (
              <tr 
                key={log.id}
                onClick={() => onLogClick(log)}
                className="hover:bg-gray-50 cursor-pointer transition"
              >
                {/* Severity */}
                <td className="w-[12%] px-3 md:px-4 py-2 md:py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <span className="text-base md:text-lg">{getSeverityIcon(log.severity)}</span>
                    <span className={`text-[10px] md:text-xs font-semibold px-1.5 md:px-2 py-0.5 rounded ${getSeverityColor(log.severity)}`}>
                      {log.severity.toUpperCase()}
                    </span>
                  </div>
                </td>

                {/* Category */}
                <td className="w-[12%] px-3 md:px-4 py-2 md:py-3 whitespace-nowrap">
                  <span className={`text-[10px] md:text-xs font-medium px-1.5 md:px-2 py-0.5 md:py-1 rounded ${getCategoryColor(log.actionCategory)}`}>
                    {log.actionCategory}
                  </span>
                </td>

                {/* Action */}
                <td className="w-[20%] px-3 md:px-4 py-2 md:py-3">
                  <div className="max-w-xs">
                    <div className="text-xs md:text-sm font-medium text-gray-900 truncate">{log.actionDescription}</div>
                    {log.notes && (
                      <div className="text-[10px] md:text-xs text-gray-500 truncate mt-1">💬 {log.notes}</div>
                    )}
                  </div>
                </td>

                {/* User */}
                <td className="w-[12%] px-3 md:px-4 py-2 md:py-3 whitespace-nowrap">
                  <div className="text-xs md:text-sm text-gray-900">{log.userName}</div>
                  <div className="text-[10px] md:text-xs text-gray-500 capitalize">{log.userRole}</div>
                </td>

                {/* Resource */}
                <td className="w-[14%] px-3 md:px-4 py-2 md:py-3">
                  <div className="max-w-xs">
                    {log.resourceName ? (
                      <>
                        <div className="text-xs md:text-sm text-gray-900 truncate">{log.resourceName}</div>
                        <div className="text-[10px] md:text-xs text-gray-500">{log.resourceType}</div>
                      </>
                    ) : (
                      <span className="text-[10px] md:text-xs text-gray-400">—</span>
                    )}
                  </div>
                </td>

                {/* Changes */}
                <td className="w-[16%] px-3 md:px-4 py-2 md:py-3">
                  <div className="max-w-xs">
                    {log.changesSummary && log.changesSummary.length > 0 ? (
                      <>
                        <div className="text-[10px] md:text-xs text-gray-700">{log.changesSummary[0]}</div>
                        {log.changesSummary.length > 1 && (
                          <div className="text-[10px] md:text-xs text-blue-600 font-medium mt-1">
                            +{log.changesSummary.length - 1} more
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-[10px] md:text-xs text-gray-400">—</span>
                    )}
                  </div>
                </td>

                {/* Time */}
                <TimeAgoCell timestamp={log.timestamp} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
