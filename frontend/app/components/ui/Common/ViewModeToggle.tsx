'use client';

import {
  MapIcon,
  Squares2X2Icon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';

export type ViewMode = 'card' | 'table' | 'map';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  showMapView?: boolean;
}

export default function ViewModeToggle({
  viewMode,
  onViewModeChange,
  showMapView = true,
}: ViewModeToggleProps) {
  return (
    <div className="flex items-center h-10.5 border border-gray-300 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => onViewModeChange('card')}
        className={`h-full px-2 transition ${
          viewMode === 'card'
            ? 'bg-black text-white'
            : 'bg-white text-gray-600 hover:bg-gray-50'
        }`}
        title="Kanban View"
        aria-label="Kanban View"
      >
        <Squares2X2Icon className="w-5 h-5" />
      </button>

      <button
        type="button"
        onClick={() => onViewModeChange('table')}
        className={`h-full px-2 transition border-l border-gray-300 ${
          viewMode === 'table'
            ? 'bg-black text-white'
            : 'bg-white text-gray-600 hover:bg-gray-50'
        }`}
        title="List View"
        aria-label="List View"
      >
        <TableCellsIcon className="w-5 h-5" />
      </button>

      {showMapView && (
        <button
          type="button"
          onClick={() => onViewModeChange('map')}
          className={`h-full px-2 transition border-l border-gray-300 ${
            viewMode === 'map'
              ? 'bg-black text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
          title="Table Map View"
          aria-label="Table Map View"
        >
          <MapIcon className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}