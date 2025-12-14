/**
 * Restaurant Map Component
 * Drag-and-drop visual layout editor for tables
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { PlusIcon, QrCodeIcon, TrashIcon } from '@heroicons/react/24/outline';
import TableCard from './TableCard';

interface Table {
  id: string;
  table_number: string;
  capacity: number;
  shape: string;
  status: string;
  position_x: number;
  position_y: number;
  qr_code_url?: string;
}

interface RestaurantMapProps {
  floorId: string;
  onTableEdit: (table: Table) => void;
  refreshKey?: number;
}

export default function RestaurantMap({
  floorId,
  onTableEdit,
  refreshKey = 0,
}: RestaurantMapProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggingTable, setDraggingTable] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (floorId) {
      fetchTables();
    }
  }, [floorId, refreshKey]);

  const fetchTables = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/manager/tables?floor_id=${floorId}`);
      const result = await response.json();

      if (result.success) {
        setTables(result.data);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (tableId: string, e: React.MouseEvent) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    setDraggingTable(tableId);
    setDragOffset({
      x: e.clientX - table.position_x,
      y: e.clientY - table.position_y,
    });
  };

  const handleDragMove = (e: React.MouseEvent) => {
    if (!draggingTable || !mapRef.current) return;

    const rect = mapRef.current.getBoundingClientRect();
    const newX = Math.max(0, Math.min(e.clientX - rect.left - dragOffset.x, rect.width - 100));
    const newY = Math.max(0, Math.min(e.clientY - rect.top - dragOffset.y, rect.height - 100));

    setTables((prev) =>
      prev.map((t) =>
        t.id === draggingTable ? { ...t, position_x: newX, position_y: newY } : t
      )
    );
  };

  const handleDragEnd = async () => {
    if (!draggingTable) return;

    const table = tables.find((t) => t.id === draggingTable);
    if (!table) return;

    try {
      await fetch('/api/manager/tables/position', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: table.id,
          position_x: table.position_x,
          position_y: table.position_y,
        }),
      });
    } catch (error) {
      console.error('Error updating position:', error);
    }

    setDraggingTable(null);
  };

  const handleDelete = async (tableId: string) => {
    if (!confirm('Are you sure you want to delete this table?')) return;

    try {
      const response = await fetch(`/api/manager/tables/${tableId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTables((prev) => prev.filter((t) => t.id !== tableId));
      }
    } catch (error) {
      console.error('Error deleting table:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-gray-900 rounded-full mx-auto" />
        <p className="text-sm text-gray-500 mt-4">Loading tables...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {tables.length} table{tables.length !== 1 ? 's' : ''} on this floor
        </div>
        <div className="text-xs text-gray-500">
          Drag tables to reposition
        </div>
      </div>

      {/* Map Canvas */}
      <div
        ref={mapRef}
        className="relative h-[600px] bg-gray-50 overflow-hidden"
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        {tables.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <PlusIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-sm text-gray-500 mb-2">No tables on this floor</p>
              <p className="text-xs text-gray-400">Click "Add Table" to create one</p>
            </div>
          </div>
        ) : (
          tables.map((table) => (
            <div
              key={table.id}
              className="absolute cursor-move"
              style={{
                left: `${table.position_x}px`,
                top: `${table.position_y}px`,
                zIndex: draggingTable === table.id ? 50 : 10,
              }}
              onMouseDown={(e) => handleDragStart(table.id, e)}
            >
              <TableCard
                table={table}
                onEdit={() => onTableEdit(table)}
                onDelete={() => handleDelete(table.id)}
                isDragging={draggingTable === table.id}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
