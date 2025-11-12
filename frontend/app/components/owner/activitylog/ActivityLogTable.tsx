'use client'

import { useState, useEffect } from 'react'
import { ActivityLog, getSeverityIcon, getSeverityColor, getCategoryColor, formatTimeAgo } from '@/lib/activityTypes'

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
    }, 60000)
    return () => clearInterval(interval)
  }, [timestamp])

  return (
    <td className="px-4 py-3 whitespace-nowrap">
      <div className="text-xs text-gray-900">{timeAgo || 'Loading...'}</div>
      <div className="text-xs text-gray-500">
        {new Date(timestamp).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </div>
    </td>
  )
}

export default function ActivityLogTable({ logs, onLogClick }: ActivityLogTableProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col h-full">
      {/* Fixed Header */}
      <div className="overflow-x-auto flex-shrink-0">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Severity
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Action
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Resource
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Changes
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Time
              </th>
            </tr>
          </thead>
        </table>
      </div>
      
      {/* Scrollable Body */}
      <div className="overflow-x-auto overflow-y-auto flex-1">
        <table className="w-full">
          <tbody className="divide-y divide-gray-200">
            {logs.map((log) => (
              <tr 
                key={log.id}
                onClick={() => onLogClick(log)}
                className="hover:bg-gray-50 cursor-pointer transition"
              >
                {/* Severity */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getSeverityIcon(log.severity)}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${getSeverityColor(log.severity)}`}>
                      {log.severity.toUpperCase()}
                    </span>
                  </div>
                </td>

                {/* Category */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${getCategoryColor(log.actionCategory)}`}>
                    {log.actionCategory}
                  </span>
                </td>

                {/* Action */}
                <td className="px-4 py-3">
                  <div className="max-w-xs">
                    <div className="text-sm font-medium text-gray-900 truncate">{log.actionDescription}</div>
                    {log.notes && (
                      <div className="text-xs text-gray-500 truncate mt-1">💬 {log.notes}</div>
                    )}
                  </div>
                </td>

                {/* User */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{log.userName}</div>
                  <div className="text-xs text-gray-500 capitalize">{log.userRole}</div>
                </td>

                {/* Resource */}
                <td className="px-4 py-3">
                  <div className="max-w-xs">
                    {log.resourceName ? (
                      <>
                        <div className="text-sm text-gray-900 truncate">{log.resourceName}</div>
                        <div className="text-xs text-gray-500">{log.resourceType}</div>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </div>
                </td>

                {/* Changes */}
                <td className="px-4 py-3">
                  <div className="max-w-xs">
                    {log.changesSummary && log.changesSummary.length > 0 ? (
                      <>
                        <div className="text-xs text-gray-700">{log.changesSummary[0]}</div>
                        {log.changesSummary.length > 1 && (
                          <div className="text-xs text-blue-600 font-medium mt-1">
                            +{log.changesSummary.length - 1} more
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
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
