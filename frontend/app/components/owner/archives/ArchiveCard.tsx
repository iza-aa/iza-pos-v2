'use client'

import { useState } from 'react'
import { 
  ArchiveBoxIcon, 
  DocumentArrowDownIcon, 
  ClockIcon, 
  ChevronDownIcon,
  ChevronUpIcon,
  TrashIcon,
  DocumentIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'

interface ArchiveCardProps {
  archiveId: string
  month: string
  year: string
  generatedAt: string
  totalRecords: {
    activities?: number
    orders?: number
    attendance?: number
  }
  keyMetrics: {
    total_revenue?: number
    total_orders?: number
    active_staff?: number
  }
  files?: {
    activity_logs?: string
    sales?: string
    staff_attendance?: string
  }
  onDownload: (archiveId: string, fileType?: string) => void
  onDelete?: (archiveId: string) => void
}

export default function ArchiveCard({
  archiveId,
  month,
  year,
  generatedAt,
  totalRecords,
  keyMetrics,
  files,
  onDownload,
  onDelete
}: ArchiveCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const formattedDate = new Date(generatedAt).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  const filesList = [
    { 
      type: 'activity_logs', 
      label: 'Activity Logs', 
      IconComponent: ClipboardDocumentListIcon,
      color: 'text-gray-700',
      available: !!files?.activity_logs || (totalRecords.activities && totalRecords.activities > 0)
    },
    { 
      type: 'sales', 
      label: 'Sales Data', 
      IconComponent: CurrencyDollarIcon,
      color: 'text-gray-700',
      available: !!files?.sales || (totalRecords.orders && totalRecords.orders > 0)
    },
    { 
      type: 'staff_attendance', 
      label: 'Staff Attendance', 
      IconComponent: UserGroupIcon,
      color: 'text-gray-700',
      available: !!files?.staff_attendance || (totalRecords.attendance && totalRecords.attendance > 0)
    }
  ].filter(f => f.available)

  return (
    <div className="bg-gray-100 rounded-xl shadow border border-gray-200 overflow-hidden break-inside-avoid mb-3 md:mb-4 hover:shadow-lg transition">
      {/* Header */}
      <div className="m-[3px] p-2.5 md:p-3 border border-gray-300 rounded-xl bg-white">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-[10px] md:text-xs font-semibold px-1.5 md:px-2 py-0.5 rounded bg-green-100 text-green-700 uppercase">
              Archived
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] md:text-xs text-gray-500">{formattedDate}</span>
            {onDelete && (
              <button
                onClick={() => onDelete(archiveId)}
                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Delete archive"
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <span className="inline-block text-[10px] md:text-xs font-medium px-1.5 md:px-2 py-0.5 rounded bg-blue-100 text-blue-700 uppercase">
          {month}
        </span>
      </div>

      {/* Content */}
      <div className="p-3 md:p-4">
        <h3 className="font-semibold text-gray-900 mb-2 text-xs md:text-sm">Archive: {month} {year}</h3>
        
        <div className="space-y-0.5 md:space-y-1 text-[10px] md:text-xs text-gray-600 mb-2 md:mb-3">
          <div className="flex items-center gap-1.5 md:gap-2">
            <span className="font-medium">Total Records:</span>
            <span>{(totalRecords.activities || 0) + (totalRecords.orders || 0) + (totalRecords.attendance || 0)}</span>
          </div>
          {keyMetrics.total_revenue !== undefined && keyMetrics.total_revenue > 0 && (
            <div className="flex items-center gap-1.5 md:gap-2">
              <span className="font-medium">Revenue:</span>
              <span className="text-green-600 font-semibold">Rp {keyMetrics.total_revenue.toLocaleString('id-ID')}</span>
            </div>
          )}
        </div>

        {/* Data Types Summary */}
        <div className="bg-white border border-gray-300 rounded-lg p-2 md:p-3 mb-2">
          <div className="text-[10px] md:text-xs font-medium text-gray-700 mb-1">Data Types:</div>
          <div className="space-y-0.5 md:space-y-1">
            {(totalRecords.activities !== undefined) && (
              <div className="text-[10px] md:text-xs text-gray-600 flex items-center gap-1.5">
                <ClipboardDocumentListIcon className="w-3 h-3" />
                <span className={totalRecords.activities > 0 ? 'text-green-700 font-medium' : 'text-gray-500'}>
                  {totalRecords.activities || 0} Activities
                </span>
              </div>
            )}
            {(totalRecords.orders !== undefined) && (
              <div className="text-[10px] md:text-xs text-gray-600 flex items-center gap-1.5">
                <CurrencyDollarIcon className="w-3 h-3" />
                <span className={totalRecords.orders > 0 ? 'text-green-700 font-medium' : 'text-gray-500'}>
                  {totalRecords.orders || 0} Sales
                </span>
              </div>
            )}
            {(totalRecords.attendance !== undefined) && (
              <div className="text-[10px] md:text-xs text-gray-600 flex items-center gap-1.5">
                <UserGroupIcon className="w-3 h-3" />
                <span className={totalRecords.attendance > 0 ? 'text-green-700 font-medium' : 'text-gray-500'}>
                  {totalRecords.attendance || 0} Attendance
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Download Files Section */}
        {filesList.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full text-[10px] md:text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-1 py-1"
            >
              <DocumentIcon className="w-3.5 h-3.5" />
              <span>View Files ({filesList.length})</span>
              {isExpanded ? (
                <ChevronUpIcon className="w-3.5 h-3.5" />
              ) : (
                <ChevronDownIcon className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Files List (Expanded) */}
            {isExpanded && (
              <div className="space-y-1.5 mt-2 pt-2 border-t border-gray-200">
                {filesList.map((file) => {
                  const IconComponent = file.IconComponent
                  return (
                    <button
                      key={file.type}
                      onClick={() => onDownload(archiveId, file.type)}
                      className="w-full px-2 py-1.5 bg-gray-50 hover:bg-gray-100 text-left text-[10px] md:text-xs rounded transition flex items-center justify-between group border border-gray-200"
                    >
                      <div className="flex items-center gap-1.5">
                        <IconComponent className="w-3.5 h-3.5 text-gray-600" />
                        <span className="text-gray-700 font-medium">{file.label}</span>
                      </div>
                      <DocumentArrowDownIcon className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
