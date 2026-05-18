import { XMarkIcon } from '@heroicons/react/24/outline'
import { ActivityLog } from '@/lib/types'
import { parseSupabaseTimestamp, formatJakartaDateTime } from '@/lib/utils'

interface ActivityLogDetailProps {
  log: ActivityLog | null
  onClose: () => void
}

const getSeverityClass = (severity: string) => {
  const normalized = severity.toLowerCase()

  if (normalized === 'critical' || normalized === 'error') return 'bg-red-50 text-red-700 border-red-200'
  if (normalized === 'warning') return 'bg-yellow-50 text-yellow-700 border-yellow-200'
  return 'bg-gray-100 text-gray-700 border-gray-200'
}

const formatLabel = (value: string) =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')

const JsonBlock = ({ title, value }: { title: string; value: unknown }) => (
  <div className="min-w-0 rounded-lg border border-gray-200 bg-gray-50 p-4">
    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
    <pre className="max-h-60 overflow-auto rounded-md bg-white p-3 text-xs leading-5 text-gray-700">
      {JSON.stringify(value, null, 2)}
    </pre>
  </div>
)

const DetailItem = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="rounded-lg border border-gray-200 bg-white p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
    <p className="mt-1 break-words text-sm font-medium text-gray-900">{value || '—'}</p>
  </div>
)

export default function ActivityLogDetail({ log, onClose }: ActivityLogDetailProps) {
  if (!log) return null

  const changesSummary = log.changesSummary ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${getSeverityClass(log.severity)}`}>
                {formatLabel(log.severity)}
              </span>
              <span className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600">
                {formatLabel(log.actionCategory)}
              </span>
            </div>
            <h2 className="mt-3 text-xl font-bold text-gray-900">Activity Details</h2>
            <p className="mt-1 text-sm text-gray-500">{log.actionDescription}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
            aria-label="Close activity details"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="User" value={`${log.userName} · ${formatLabel(log.userRole)}`} />
            <DetailItem label="Timestamp" value={formatJakartaDateTime(parseSupabaseTimestamp(log.timestamp))} />
            <DetailItem label="Action" value={formatLabel(log.action)} />
            <DetailItem label="Resource" value={log.resourceName ? `${formatLabel(log.resourceType)}: ${log.resourceName}` : formatLabel(log.resourceType)} />
            <DetailItem label="IP Address" value={log.ipAddress} />
            <DetailItem label="Device" value={log.deviceInfo} />
          </div>

          {changesSummary.length > 0 ? (
            <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Changes Made</p>
              <div className="space-y-2">
                {changesSummary.map((change, index) => (
                  <div key={`${log.id}-detail-change-${index}`} className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    {change}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {(log.previousValue || log.newValue) ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {log.previousValue ? <JsonBlock title="Previous Value" value={log.previousValue} /> : null}
              {log.newValue ? <JsonBlock title="New Value" value={log.newValue} /> : null}
            </div>
          ) : null}

          {log.notes ? (
            <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notes</p>
              <p className="mt-2 text-sm text-gray-700">{log.notes}</p>
            </div>
          ) : null}

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <DetailItem label="Session ID" value={log.sessionId} />
            <DetailItem label="Reversible" value={log.isReversible ? 'Yes' : 'No'} />
          </div>
        </div>

        <div className="border-t border-gray-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}