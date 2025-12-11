import { Squares2X2Icon, TableCellsIcon } from '@heroicons/react/24/outline'

export type ViewMode = 'card' | 'table'

interface ViewModeToggleProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

export default function ViewModeToggle({ viewMode, onViewModeChange }: ViewModeToggleProps) {
  return (
    <div className="flex items-center h-[42px] border border-gray-300 rounded-xl overflow-hidden">
      <button
        onClick={() => onViewModeChange('card')}
        className={`h-full px-2 transition ${
          viewMode === 'card'
            ? 'bg-black text-white'
            : 'bg-white text-gray-600 hover:bg-gray-50'
        }`}
        title="Card View"
      >
        <Squares2X2Icon className="w-5 h-5" />
      </button>
      <button
        onClick={() => onViewModeChange('table')}
        className={`h-full px-2 transition ${
          viewMode === 'table'
            ? 'bg-black text-white'
            : 'bg-white text-gray-600 hover:bg-gray-50'
        }`}
        title="Table View"
      >
        <TableCellsIcon className="w-5 h-5" />
      </button>
    </div>
  )
}
