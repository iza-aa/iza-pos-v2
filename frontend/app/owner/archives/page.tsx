'use client'

import { useState, useEffect } from 'react'
import { useSessionValidation } from '@/lib/useSessionValidation'
import { ArchiveBoxIcon, PlusIcon, FolderIcon, ClipboardDocumentListIcon, CurrencyDollarIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { ArchiveCard } from '@/app/components/owner/archives'
import { generateMonthlyArchive, ArchiveMetadata, loadArchivesFromDB, deleteArchiveFromDB } from '@/lib/archiveService'
import { showSuccess, showError } from '@/lib/errorHandling'

export default function ArchivesPage() {
  useSessionValidation()
  
  const [archives, setArchives] = useState<ArchiveMetadata[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingArchives, setLoadingArchives] = useState(true)

  // Load archived data from database
  useEffect(() => {
    loadArchives()
  }, [])

  const loadArchives = async () => {
    setLoadingArchives(true)
    try {
      const data = await loadArchivesFromDB()
      setArchives(data)
    } catch (error) {
      console.error('Failed to load archives:', error)
      showError('Failed to load archives')
    } finally {
      setLoadingArchives(false)
    }
  }

  const handleGenerateArchive = async () => {
    setLoading(true)
    try {
      const result = await generateMonthlyArchive(['activity_logs', 'sales', 'staff_attendance'])
      
      if (result.success) {
        showSuccess(result.message)
        // Reload archives from database
        await loadArchives()
      } else {
        showError(result.message)
      }
    } catch (error: any) {
      showError(error.message || 'Failed to generate archive')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (archiveId: string, fileType?: string) => {
    setLoading(true)
    try {
      // If specific file type requested, generate and download that file only
      if (fileType) {
        let dataTypes: ('activity_logs' | 'sales' | 'staff_attendance')[] = []
        if (fileType === 'activity_logs') dataTypes = ['activity_logs']
        else if (fileType === 'sales') dataTypes = ['sales']
        else if (fileType === 'staff_attendance') dataTypes = ['staff_attendance']

        const result = await generateMonthlyArchive(dataTypes)
        
        if (result.success) {
          showSuccess(`${fileType === 'activity_logs' ? 'Activity Logs' : fileType === 'sales' ? 'Sales Report' : 'Staff Attendance'} downloaded successfully`)
        } else {
          showError(result.message)
        }
      } else {
        // Download all files
        const result = await generateMonthlyArchive(['activity_logs', 'sales', 'staff_attendance'])
        
        if (result.success) {
          showSuccess('All archive files downloaded successfully')
        } else {
          showError(result.message)
        }
      }
    } catch (error: any) {
      showError(error.message || 'Failed to download archive')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (archiveId: string) => {
    // Show confirmation dialog
    const confirmed = window.confirm('Are you sure you want to delete this archive? This action cannot be undone.')
    
    if (confirmed) {
      setLoading(true)
      try {
        const result = await deleteArchiveFromDB(archiveId)
        
        if (result.success) {
          showSuccess(result.message)
          // Reload archives from database
          await loadArchives()
        } else {
          showError(result.message)
        }
      } catch (error: any) {
        showError(error.message || 'Failed to delete archive')
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="h-[calc(100vh-55px)] flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <section className="flex-shrink-0 px-4 md:px-6 pt-4 md:pt-6 pb-4 bg-white border-b border-gray-200">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Data Archives</h1>
            <p className="text-sm text-gray-600 mt-1">
              Monthly archives for Activity Logs, Sales, and Staff Attendance
            </p>
          </div>

          <button
            onClick={handleGenerateArchive}
            disabled={loading}
            className="px-4 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <PlusIcon className="w-5 h-5" />
                <span>Generate Archive</span>
              </>
            )}
          </button>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          {/* Activity Logs Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ClipboardDocumentListIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium uppercase tracking-wide">Activity Logs</p>
                  <p className="text-lg font-bold text-gray-900 mt-0.5">Complete Audit Trail</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sales Data Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CurrencyDollarIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium uppercase tracking-wide">Sales Data</p>
                  <p className="text-lg font-bold text-gray-900 mt-0.5">Revenue & Orders</p>
                </div>
              </div>
            </div>
          </div>

          {/* Staff Attendance Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center flex-shrink-0">
                  <UserGroupIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium uppercase tracking-wide">Staff Attendance</p>
                  <p className="text-lg font-bold text-gray-900 mt-0.5">Time Tracking</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Archives List */}
      <section className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
        {loadingArchives ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Loading archives...</p>
          </div>
        ) : archives.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FolderIcon className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Archives Yet</h3>
            <p className="text-sm text-gray-600 mb-4 max-w-md">
              Generate your first monthly archive to create backups of your activity logs, sales data, and staff attendance.
            </p>
            <button
              onClick={handleGenerateArchive}
              disabled={loading}
              className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition flex items-center gap-2 font-medium disabled:opacity-50"
            >
              <ArchiveBoxIcon className="w-5 h-5" />
              <span>Generate First Archive</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {archives.map((archive) => (
              <ArchiveCard
                key={archive.archive_id}
                archiveId={archive.archive_id}
                month={archive.period.month}
                year={archive.period.year}
                generatedAt={archive.generated_at}
                totalRecords={archive.total_records}
                keyMetrics={archive.key_metrics}
                onDownload={handleDownload}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
