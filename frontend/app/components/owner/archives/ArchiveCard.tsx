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
  periodStartDate?: string
  periodEndDate?: string
  archiveType?: 'monthly' | 'custom_range' | string
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

const MONTH_ORDER: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11
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

const formatDateOnly = (value?: string) => {
  if (!value) return ''

  const normalizedValue = value.includes('T') ? value : `${value}T00:00:00`
  const date = new Date(normalizedValue)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  }).format(date)
}

const getFullMonthEndDate = (month: string, year: string) => {
  const monthIndex = MONTH_ORDER[month.toLowerCase()]
  const parsedYear = Number(year)

  if (monthIndex === undefined || Number.isNaN(parsedYear)) {
    return undefined
  }

  const lastDay = new Date(parsedYear, monthIndex + 1, 0)
  const lastDayNumber = String(lastDay.getDate()).padStart(2, '0')
  const monthNumber = String(monthIndex + 1).padStart(2, '0')

  return `${parsedYear}-${monthNumber}-${lastDayNumber}`
}

const isFullMonthRange = ({
  month,
  year,
  periodStartDate,
  periodEndDate
}: Pick<ArchiveCardProps, 'month' | 'year' | 'periodStartDate' | 'periodEndDate'>) => {
  if (!periodStartDate || !periodEndDate) return true

  const monthIndex = MONTH_ORDER[month.toLowerCase()]
  const parsedYear = Number(year)

  if (monthIndex === undefined || Number.isNaN(parsedYear)) {
    return false
  }

  const monthNumber = String(monthIndex + 1).padStart(2, '0')
  const expectedStart = `${parsedYear}-${monthNumber}-01`
  const expectedEnd = getFullMonthEndDate(month, year)

  return periodStartDate === expectedStart && periodEndDate === expectedEnd
}

const getRangeLabel = ({
  periodStartDate,
  periodEndDate
}: Pick<ArchiveCardProps, 'periodStartDate' | 'periodEndDate'>) => {
  const startLabel = formatDateOnly(periodStartDate)
  const endLabel = formatDateOnly(periodEndDate)

  if (startLabel && endLabel) {
    return `${startLabel} - ${endLabel}`
  }

  return ''
}

export default function ArchiveCard({
  archiveId,
  month,
  year,
  generatedAt,
  periodStartDate,
  periodEndDate,
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
  const rangeLabel = getRangeLabel({ periodStartDate, periodEndDate })
  const titleLabel = `${month} ${year}`
  const showRangeLabel =
    Boolean(rangeLabel) &&
    !isFullMonthRange({
      month,
      year,
      periodStartDate,
      periodEndDate
    })

  const filesList = useMemo<ArchiveFileItem[]>((() => {
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
  }) as () => ArchiveFileItem[], [
    activityCount,
    attendanceCount,
    files?.activity_logs,
    files?.sales,
    files?.staff_attendance,
    salesCount
  ])

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
    <article className="self-start overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:border-gray-300 hover:shadow-md">
      <div className="border-b border-gray-100 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-600">
              <ArchiveBoxIcon className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-gray-950">
                Archive: {titleLabel}
              </h3>

              <p className="mt-1 text-xs text-gray-500">Generated on {generatedDate}</p>

              {showRangeLabel ? (
                <p className="mt-1 text-xs font-medium text-gray-600">
                  Period: {rangeLabel}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onDownload(archiveId)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
              title="Download all files"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
            </button>

            {onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(archiveId)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition hover:bg-red-50 hover:text-red-600"
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
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Total Records</p>
            <p className="mt-1 text-xl font-semibold text-gray-950">{totalRecordCount}</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Revenue</p>
            <p className="mt-1 truncate text-lg font-semibold text-green-600">
              {formatCurrency(keyMetrics.total_revenue)}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="mb-3 text-sm font-semibold text-gray-900">Data Included</p>

          <div className="space-y-2">
            {dataSummary.map(({ label, value, IconComponent }) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
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
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={() => setIsExpanded((current) => !current)}
              className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition hover:bg-gray-50"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <FolderOpenIcon className="h-4 w-4 text-gray-500" />
                View Files
              </span>

              {isExpanded ? (
                <ChevronUpIcon className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDownIcon className="h-4 w-4 text-gray-400" />
              )}
            </button>

            {isExpanded ? (
              <div className="space-y-3 border-t border-gray-100 bg-gray-50 p-3">
                {filesList.map((file) => {
                  const IconComponent = file.IconComponent

                  return (
                    <div key={file.type} className="rounded-xl border border-gray-200 bg-white p-3">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <IconComponent className="h-4 w-4 shrink-0 text-gray-500" />
                          <span className="truncate text-sm font-semibold text-gray-900">{file.label}</span>
                        </div>

                        <span className="text-xs font-semibold text-gray-500">
                          {file.count} records
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => onDownload(archiveId, file.type, 'pdf')}
                          className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                        >
                          <span className="flex items-center gap-2">
                            <DocumentTextIcon className="h-4 w-4" />
                            PDF
                          </span>
                          <ArrowDownTrayIcon className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDownload(archiveId, file.type, 'excel')}
                          className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                        >
                          <span className="flex items-center gap-2">
                            <TableCellsIcon className="h-4 w-4" />
                            Excel
                          </span>
                          <ArrowDownTrayIcon className="h-4 w-4" />
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