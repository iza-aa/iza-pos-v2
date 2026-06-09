'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/app/components/shared/i18n';
import { supabase } from '@/lib/config/supabaseClient';

interface Floor {
  id: string;
  name: string;
  floor_number: number;
  is_active: boolean | null;
  created_at: string | null;
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
  const { t } = useLanguage();
  const [floors, setFloors] = useState<Floor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFloors = async () => {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('floors')
        .select('id, name, floor_number, is_active, created_at')
        .eq('is_active', true)
        .order('floor_number', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch floors:', error);
        setFloors([]);
        setIsLoading(false);
        return;
      }

      const activeFloors = data ?? [];

      setFloors(activeFloors);

      const selectedFloorStillExists = activeFloors.some(
        (floor) => floor.id === selectedFloor
      );

      if (!selectedFloorStillExists) {
        onFloorChange(activeFloors.length > 0 ? activeFloors[0].id : null);
      }

      setIsLoading(false);
    };

    fetchFloors();
  }, [refreshKey, selectedFloor, onFloorChange]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 overflow-x-auto">
        <div className="h-10 w-32 rounded-lg bg-gray-200 animate-pulse" />
        <div className="h-10 w-32 rounded-lg bg-gray-200 animate-pulse" />
      </div>
    );
  }

  if (floors.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        {t('manager.table.noActiveFloors')}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      {floors.map((floor) => {
        const isSelected = selectedFloor === floor.id;

        return (
          <button
            key={floor.id}
            type="button"
            onClick={() => onFloorChange(floor.id)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              isSelected
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {floor.name}
          </button>
        );
      })}
    </div>
  );
}
