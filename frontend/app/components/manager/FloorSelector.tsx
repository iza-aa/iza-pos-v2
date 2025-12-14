/**
 * Floor Selector Component
 * Horizontal selector for switching between floors
 */

'use client';

import { useEffect, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface Floor {
  id: string;
  name: string;
  floor_number: number;
  total_tables?: number;
  available_tables?: number;
  occupied_tables?: number;
}

interface FloorSelectorProps {
  selectedFloor: string | null;
  onFloorChange: (floorId: string | null) => void;
  refreshKey?: number;
}

export default function FloorSelector({
  selectedFloor,
  onFloorChange,
  refreshKey = 0,
}: FloorSelectorProps) {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    fetchFloors();
  }, [refreshKey]);

  const fetchFloors = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/manager/floors?with_tables=true');
      const result = await response.json();

      if (result.success) {
        setFloors(result.data);
        
        // Auto-select first floor if none selected
        if (!selectedFloor && result.data.length > 0) {
          onFloorChange(result.data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching floors:', error);
    } finally {
      setLoading(false);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    const container = document.getElementById('floor-scroll-container');
    if (container) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 w-32 bg-gray-200 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (floors.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-500">
          No floors available. Create a floor to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex items-center">
      {/* Scroll Left Button */}
      {scrollPosition > 0 && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 z-10 h-10 w-10 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors shadow-md"
        >
          <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
        </button>
      )}

      {/* Floor Cards Container */}
      <div
        id="floor-scroll-container"
        className="flex overflow-x-auto space-x-4 scroll-smooth hide-scrollbar px-2"
        onScroll={(e) => setScrollPosition(e.currentTarget.scrollLeft)}
      >
        {floors.map((floor) => {
          const isSelected = selectedFloor === floor.id;
          const occupancyRate = floor.total_tables
            ? Math.round(((floor.occupied_tables || 0) / floor.total_tables) * 100)
            : 0;

          return (
            <button
              key={floor.id}
              onClick={() => onFloorChange(floor.id)}
              className={`flex-shrink-0 p-4 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="text-left">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    {floor.name}
                  </span>
                  {floor.total_tables !== undefined && (
                    <span className="text-xs text-gray-500 ml-2">
                      {floor.occupied_tables}/{floor.total_tables}
                    </span>
                  )}
                </div>

                {/* Occupancy Bar */}
                {floor.total_tables !== undefined && floor.total_tables > 0 && (
                  <div className="space-y-1">
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          occupancyRate >= 80
                            ? 'bg-red-500'
                            : occupancyRate >= 50
                            ? 'bg-amber-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${occupancyRate}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">
                        {floor.available_tables || 0} free
                      </span>
                      <span className="text-gray-600 font-medium">
                        {occupancyRate}%
                      </span>
                    </div>
                  </div>
                )}

                {floor.total_tables === 0 && (
                  <p className="text-xs text-gray-400">No tables</p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Scroll Right Button */}
      <button
        onClick={() => scroll('right')}
        className="absolute right-0 z-10 h-10 w-10 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors shadow-md"
      >
        <ChevronRightIcon className="h-5 w-5 text-gray-600" />
      </button>

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
