import { XMarkIcon } from '@heroicons/react/24/outline'
import { ActivityLog, getSeverityIcon, getSeverityColor, getCategoryColor } from '@/lib/types'

import { parseSupabaseTimestamp, formatJakartaDateTime } from "@/lib/utils";

interface ActivityLogDetailProps {
  log: ActivityLog | null
  onClose: () => void
}

export default function ActivityLogDetail({ log, onClose }: ActivityLogDetailProps) {
  if (!log) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Activity Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Severity & Category */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{getSeverityIcon(log.severity)}</span>
            <span className={`text-sm font-semibold px-3 py-1 rounded ${getSeverityColor(log.severity)}`}>
              {log.severity.toUpperCase()}
            </span>
            <span className={`text-sm font-medium px-3 py-1 rounded ${getCategoryColor(log.actionCategory)}`}>
              {log.actionCategory}
            </span>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-4">{log.actionDescription}</h3>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-sm font-medium text-gray-500">User</div>
              <div className="text-sm text-gray-900">{log.userName} (@{log.userId})</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Role</div>
              <div className="text-sm text-gray-900 capitalize">{log.userRole}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Timestamp</div>
              <div className="text-sm text-gray-900">{formatJakartaDateTime(parseSupabaseTimestamp(log.timestamp))}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Action</div>
              <div className="text-sm text-gray-900">{log.action}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">IP Address</div>
              <div className="text-sm text-gray-900">{log.ipAddress}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Device</div>
              <div className="text-sm text-gray-900">{log.deviceInfo}</div>
            </div>
          </div>

          {/* Resource Info */}
          {log.resourceName && (
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-500 mb-1">Resource</div>
              <div className="text-sm text-gray-900">
                {log.resourceType}: {log.resourceName} ({log.resourceId})
              </div>
            </div>
          )}

          {/* Changes */}
          {log.changesSummary && log.changesSummary.length > 0 && (
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-500 mb-2">Changes Made</div>
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                {log.changesSummary.map((change, idx) => (
                  <div key={idx} className="text-sm text-gray-700">• {change}</div>
                ))}
              </div>
            </div>
          )}

          {/* Previous/New Values */}
          {(log.previousValue || log.newValue) && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              {log.previousValue && (
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-2">Previous Value</div>
                  <pre className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700 overflow-x-auto">
                    {JSON.stringify(log.previousValue, null, 2)}
                  </pre>
                </div>
              )}
              {log.newValue && (
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-2">New Value</div>
                  <pre className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700 overflow-x-auto">
                    {JSON.stringify(log.newValue, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {log.notes && (
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-500 mb-1">Notes</div>
              <div className="text-sm text-gray-700 bg-yellow-50 rounded-lg p-3">
                💬 {log.notes}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="border-t border-gray-200 pt-4">
            <div className="text-sm text-gray-500 space-y-1">
              <div>Session ID: {log.sessionId}</div>
              <div>Reversible: {log.isReversible ? 'Yes' : 'No'}</div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
