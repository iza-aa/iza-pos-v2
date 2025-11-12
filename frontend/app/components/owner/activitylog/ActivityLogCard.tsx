'use client'

import { useState, useEffect } from 'react'
import { ActivityLog, getSeverityIcon, getSeverityColor, getCategoryColor, formatTimeAgo } from '@/lib/activityTypes'

interface ActivityLogCardProps {
  log: ActivityLog
  onClick: (log: ActivityLog) => void
}

export default function ActivityLogCard({ log, onClick }: ActivityLogCardProps) {
  const [timeAgo, setTimeAgo] = useState<string>('')

  useEffect(() => {
    // Set initial time
    setTimeAgo(formatTimeAgo(log.timestamp))

    // Update every minute
    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(log.timestamp))
    }, 60000)

    return () => clearInterval(interval)
  }, [log.timestamp])

  return (
    <div 
      className="bg-gray-100 rounded-xl shadow border border-gray-100 border border-gray-200 overflow-hidden break-inside-avoid mb-4 cursor-pointer hover:shadow-lg transition"
      onClick={() => onClick(log)}
    >
      {/* Header */}
      <div className="m-[3px] p-3 border border-gray-300 rounded-xl bg-white">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{getSeverityIcon(log.severity)}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${getSeverityColor(log.severity)}`}>
              {log.severity.toUpperCase()}
            </span>
          </div>
          <span className="text-xs mt-1 text-gray-500">{timeAgo || 'Loading...'}</span>
        </div>
        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${getCategoryColor(log.actionCategory)}`}>
          {log.actionCategory}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2 text-sm">{log.actionDescription}</h3>
        
        <div className="space-y-1 text-xs text-gray-600 mb-3">
          <div className="flex items-center gap-2">
            <span className="font-medium">User:</span>
            <span>{log.userName} ({log.userRole})</span>
          </div>
          {log.resourceName && (
            <div className="flex items-center gap-2">
              <span className="font-medium">Resource:</span>
              <span className="truncate">{log.resourceName}</span>
            </div>
          )}
        </div>

        {/* Changes Summary */}
        {log.changesSummary && log.changesSummary.length > 0 && (
          <div className="bg-white border border-gray-300 rounded-lg p-3 mb-2">
            <div className="text-xs font-medium text-gray-700 mb-1">Changes:</div>
            <div className="space-y-1">
              {log.changesSummary.slice(0, 2).map((change, idx) => (
                <div key={idx} className="text-xs text-gray-600">• {change}</div>
              ))}
              {log.changesSummary.length > 2 && (
                <div className="text-xs text-blue-600 font-medium">
                  +{log.changesSummary.length - 2} more changes
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {log.notes && (
          <div className="text-xs text-gray-500 italic mt-2 border-t border-gray-100 pt-2">
            💬 {log.notes}
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-3">
          {log.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-xs bg-white text-black px-2 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
