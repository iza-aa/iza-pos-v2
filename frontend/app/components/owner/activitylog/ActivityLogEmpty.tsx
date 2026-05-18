import { DocumentMagnifyingGlassIcon } from '@heroicons/react/24/outline'

interface ActivityLogEmptyProps {
  hasFilters: boolean
  onClearFilters: () => void
}

export default function ActivityLogEmpty({ hasFilters, onClearFilters }: ActivityLogEmptyProps) {
  return (
    <div className="flex h-full min-h-[360px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
      <div className="mx-auto max-w-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
          <DocumentMagnifyingGlassIcon className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-gray-900">No activity logs found</h3>
        <p className="mt-2 text-sm text-gray-500">
          {hasFilters
            ? 'No logs match the current search or filter criteria.'
            : 'Activity logs will appear here after users start performing actions.'}
        </p>
        {hasFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Clear Filters
          </button>
        ) : null}
      </div>
    </div>
  )
}