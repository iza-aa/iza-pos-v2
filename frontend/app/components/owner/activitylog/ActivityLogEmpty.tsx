interface ActivityLogEmptyProps {
  hasFilters: boolean
  onClearFilters: () => void
}

export default function ActivityLogEmpty({ hasFilters, onClearFilters }: ActivityLogEmptyProps) {
  return (
    <div className="text-center py-12">
      <p className="text-gray-500">No activity logs found</p>
      {hasFilters && (
        <button 
          onClick={onClearFilters}
          className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
