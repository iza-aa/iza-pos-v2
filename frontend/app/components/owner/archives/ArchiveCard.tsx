'use client'

import { useMemo, useState } from 'react'
import {
  ArchiveBoxIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TrashIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  DocumentTextIcon,
  TableCellsIcon,
  FolderOpenIcon
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
  onDownload: (archiveId: string, fileType?: string, format?: 'pdf' | 'excel') => void
  onDelete?: (archiveId: string) => void
}

type ArchiveFileType = 'activity_logs' | 'sales' | 'staff_attendance'

interface ArchiveFileItem {
  type: ArchiveFileType
  label: string
  count: number
  IconComponent: typeof ClipboardDocumentListIcon
  available: boolean
}

const formatCurrency = (value?: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value ?? 0)
}

const formatGeneratedDate = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date)
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

  const activityCount = totalRecords.activities ?? 0
  const salesCount = totalRecords.orders ?? 0
  const attendanceCount = totalRecords.attendance ?? 0
  const totalRecordCount = activityCount + salesCount + attendanceCount
  const generatedDate = formatGeneratedDate(generatedAt)

  const filesList = useMemo<ArchiveFileItem[]>(() => {
    const items: ArchiveFileItem[] = [
      {
        type: 'activity_logs',
        label: 'Activity Logs',
        count: activityCount,
        IconComponent: ClipboardDocumentListIcon,
        available: Boolean(files?.activity_logs) || activityCount > 0
      },
      {
        type: 'sales',
        label: 'Sales Report',
        count: salesCount,
        IconComponent: CurrencyDollarIcon,
        available: Boolean(files?.sales) || salesCount > 0
      },
      {
        type: 'staff_attendance',
        label: 'Staff Attendance',
        count: attendanceCount,
        IconComponent: UserGroupIcon,
        available: Boolean(files?.staff_attendance) || attendanceCount > 0
      }
    ]

    return items.filter((file) => file.available)
  }, [activityCount, attendanceCount, files?.activity_logs, files?.sales, files?.staff_attendance, salesCount])

  const dataSummary = [
    {
      label: 'Activities',
      value: activityCount,
      IconComponent: ClipboardDocumentListIcon
    },
    {
      label: 'Sales',
      value: salesCount,
      IconComponent: CurrencyDollarIcon
    },
    {
      label: 'Attendance',
      value: attendanceCount,
      IconComponent: UserGroupIcon
    }
  ]

  return (
    <article className="self-start overflow-hidden rounded-2xl border border-gray-200 bg-white  transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="border-b border-gray-100 bg-linear-to-br from-white to-gray-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm">
              <ArchiveBoxIcon className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-gray-950">
                Archive: {month} {year}
              </h3>
              <p className="mt-1 text-xs text-gray-500">Generated on {generatedDate}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onDownload(archiveId)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-600 transition hover:bg-gray-100 hover:text-gray-950"
              title="Download all files"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
            </button>

            {onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(archiveId)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-red-500 transition hover:bg-red-50 hover:text-red-600"
                title="Delete archive"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Total Records</p>
            <p className="mt-1 text-xl font-semibold text-gray-950">{totalRecordCount}</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Revenue</p>
            <p className="mt-1 truncate text-lg font-semibold text-green-600">
              {formatCurrency(keyMetrics.total_revenue)}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="mb-3 text-sm font-semibold text-gray-900">Data Included</p>

          <div className="space-y-2">
            {dataSummary.map(({ label, value, IconComponent }) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-gray-600">
                  <IconComponent className="h-4 w-4" />
                  <span className="text-sm">{label}</span>
                </div>
                <span className={`text-sm font-semibold ${value > 0 ? 'text-gray-950' : 'text-gray-400'}`}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {filesList.length > 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white">
            <button
              type="button"
              onClick={() => setIsExpanded((current) => !current)}
              className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition hover:bg-gray-50"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <FolderOpenIcon className="h-4 w-4 text-gray-500" />
                View Files ({filesList.length})
              </span>

              {isExpanded ? (
                <ChevronUpIcon className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDownIcon className="h-4 w-4 text-gray-400" />
              )}
            </button>

            {isExpanded ? (
              <div className="space-y-2 border-t border-gray-100 p-3">
                {filesList.map((file) => {
                  const IconComponent = file.IconComponent

                  return (
                    <div key={file.type} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <IconComponent className="h-4 w-4 shrink-0 text-gray-500" />
                          <span className="truncate text-sm font-semibold text-gray-900">{file.label}</span>
                        </div>

                        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-gray-700 ring-1 ring-gray-200">
                          {file.count}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => onDownload(archiveId, file.type, 'pdf')}
                          className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-100 hover:text-gray-950"
                        >
                          <DocumentTextIcon className="h-4 w-4" />
                          PDF
                        </button>

                        <button
                          type="button"
                          onClick={() => onDownload(archiveId, file.type, 'excel')}
                          className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-100 hover:text-gray-950"
                        >
                          <TableCellsIcon className="h-4 w-4" />
                          Excel
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  )
}