'use client'

import { useState } from 'react'
import { XMarkIcon, ArchiveBoxIcon, ClockIcon } from '@heroicons/react/24/outline'
import { dismissArchiveReminder, generateMonthlyArchive, deleteArchivedData, getPreviousMonthRange } from '@/lib/archiveService'
import { showSuccess, showError } from '@/lib/errorHandling'

interface ArchiveBannerProps {
  onDismiss: () => void
}

export default function ArchiveBanner({ onDismiss }: ArchiveBannerProps) {
  const [loading, setLoading] = useState(false)
  const [showDeleteOption, setShowDeleteOption] = useState(false)
  const period = getPreviousMonthRange()

  const handleArchive = async (deleteAfter: boolean = false) => {
    setLoading(true)
    try {
      // Generate archives
      const result = await generateMonthlyArchive(['activity_logs', 'sales', 'staff_attendance'])
      
      if (result.success) {
        showSuccess(`Archive generated successfully for ${period.month} ${period.year}!`)
        
        // Optional: Delete data after archive
        if (deleteAfter) {
          const deleteResult = await deleteArchivedData(
            period.start, 
            period.end, 
            ['activity_logs'] // Only delete activity logs, keep sales & attendance
          )
          
          if (deleteResult.success) {
            showSuccess('Old activity logs deleted from database')
          }
        }
        
        onDismiss()
      } else {
        showError(result.message)
      }
    } catch (error: any) {
      showError(error.message || 'Failed to generate archive')
    } finally {
      setLoading(false)
    }
  }

  const handleRemindLater = () => {
    dismissArchiveReminder()
    onDismiss()
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          <ArchiveBoxIcon className="w-6 h-6 text-blue-600" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                📦 Monthly Archive Reminder
              </h3>
              <p className="text-sm text-gray-700 mb-3">
                Archive data for <span className="font-semibold text-blue-700">{period.month} {period.year}</span> to keep your database optimized and create AI-ready backups.
              </p>
              
              {/* Stats Preview */}
              <div className="flex flex-wrap gap-3 mb-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Activity Logs</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Sales Data</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Staff Attendance</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleArchive(false)}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <ArchiveBoxIcon className="w-4 h-4" />
                      <span>Archive Now</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowDeleteOption(!showDeleteOption)}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Archive & Clean Database
                </button>

                <button
                  onClick={handleRemindLater}
                  disabled={loading}
                  className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <ClockIcon className="w-4 h-4" />
                  <span>Remind Later</span>
                </button>
              </div>

              {/* Delete Warning */}
              {showDeleteOption && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-800 mb-2">
                    ⚠️ <strong>Warning:</strong> This will delete old activity logs from the database after archiving. Sales and attendance data will be preserved.
                  </p>
                  <button
                    onClick={() => handleArchive(true)}
                    disabled={loading}
                    className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition disabled:opacity-50"
                  >
                    Confirm Archive & Delete
                  </button>
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={handleRemindLater}
              disabled={loading}
              className="flex-shrink-0 p-1 hover:bg-white/50 rounded-lg transition disabled:opacity-50"
              title="Dismiss"
            >
              <XMarkIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
