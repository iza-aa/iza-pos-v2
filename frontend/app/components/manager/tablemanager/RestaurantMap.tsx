/**
 * Restaurant Map Component
 * Drag-and-drop visual layout editor for tables
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import TableCard from './TableCard';
import QRCodeModal from './QRCodeModal';

const TABLE_SIZE = 96;

interface Table {
  id: string;
  table_number: string;
  floor_id?: string | null;
  capacity: number;
  shape: string | null;
  status: string | null;
  position_x: number | null;
  position_y: number | null;
  qr_code_url?: string | null;
  qr_code_image?: string | null;
  qr_generated_at?: string | null;
  current_order_id?: string | null;
  occupied_at?: string | null;
  occupied_by_customer?: string | null;
  is_active?: boolean | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface RestaurantMapProps {
  floorId: string;
  onTableEdit: (table: Table) => void;
  refreshKey?: number;
}

interface DragState {
  tableId: string;
  offsetX: number;
  offsetY: number;
}

export default function RestaurantMap({
  floorId,
  onTableEdit,
  refreshKey = 0,
}: RestaurantMapProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [qrTable, setQrTable] = useState<Table | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const latestTablesRef = useRef<Table[]>([]);

  useEffect(() => {
    latestTablesRef.current = tables;
  }, [tables]);

  const fetchTables = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/manager/tables?floor_id=${encodeURIComponent(floorId)}`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch tables.');
      }

      const activeTables = (result.data ?? []).filter(
        (table: Table) => table.is_active !== false
      );

      setTables(activeTables);
    } catch (error) {
      console.error('Error fetching tables:', error);
      setTables([]);
    } finally {
      setLoading(false);
    }
  }, [floorId]);

  useEffect(() => {
    if (!floorId) return;

    fetchTables();
  }, [floorId, refreshKey, fetchTables]);

  const getSafeTablePosition = (
    clientX: number,
    clientY: number,
    offsetX: number,
    offsetY: number
  ) => {
    const mapElement = mapRef.current;

    if (!mapElement) {
      return {
        x: 0,
        y: 0,
      };
    }

    const rect = mapElement.getBoundingClientRect();

    const rawX = clientX - rect.left - offsetX;
    const rawY = clientY - rect.top - offsetY;

    const maxX = Math.max(0, rect.width - TABLE_SIZE);
    const maxY = Math.max(0, rect.height - TABLE_SIZE);

    return {
      x: Math.round(Math.max(0, Math.min(rawX, maxX))),
      y: Math.round(Math.max(0, Math.min(rawY, maxY))),
    };
  };

  const handleDragStart = (table: Table, event: React.MouseEvent) => {
    const target = event.target as HTMLElement;

    if (target.closest('button')) {
      return;
    }

    const mapElement = mapRef.current;

    if (!mapElement) {
      return;
    }

    event.preventDefault();

    const rect = mapElement.getBoundingClientRect();

    const positionX = table.position_x ?? 0;
    const positionY = table.position_y ?? 0;

    setDragState({
      tableId: table.id,
      offsetX: event.clientX - rect.left - positionX,
      offsetY: event.clientY - rect.top - positionY,
    });
  };

  const handleDragMove = (event: React.MouseEvent) => {
    if (!dragState) {
      return;
    }

    const nextPosition = getSafeTablePosition(
      event.clientX,
      event.clientY,
      dragState.offsetX,
      dragState.offsetY
    );

    setTables((previousTables) =>
      previousTables.map((table) =>
        table.id === dragState.tableId
          ? {
              ...table,
              position_x: nextPosition.x,
              position_y: nextPosition.y,
            }
          : table
      )
    );
  };

  const handleDragEnd = async () => {
    if (!dragState) {
      return;
    }

    const draggedTable = latestTablesRef.current.find(
      (table) => table.id === dragState.tableId
    );

    setDragState(null);

    if (!draggedTable) {
      return;
    }

    try {
      const response = await fetch('/api/manager/tables/position', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: draggedTable.id,
          position_x: draggedTable.position_x ?? 0,
          position_y: draggedTable.position_y ?? 0,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || result?.success === false) {
        throw new Error(result?.message || 'Failed to update table position.');
      }
    } catch (error) {
      console.error('Error updating position:', error);
      fetchTables();
    }
  };

  const handleEditTable = (table: Table) => {
    onTableEdit(table);
  };

  const handleShowQR = (table: Table) => {
    setQrTable(table);
    setIsQRModalOpen(true);
  };

  const handleCloseQR = () => {
    setIsQRModalOpen(false);
    setQrTable(null);
  };

  const handleDelete = async (table: Table) => {
    const status = table.status?.toLowerCase();

    if (status === 'occupied' || table.current_order_id) {
      window.alert(
        `Table ${table.table_number} cannot be deleted because it is currently occupied or has an active order.`
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete Table ${table.table_number}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/manager/tables/${table.id}`, {
        method: 'DELETE',
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || result?.success === false) {
        throw new Error(result?.message || 'Failed to delete table.');
      }

      setTables((previousTables) =>
        previousTables.filter((item) => item.id !== table.id)
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete table.';

      console.error('Error deleting table:', error);
      window.alert(message);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" />
        <p className="mt-4 text-sm text-gray-500">Loading tables...</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <div>
            <p className="text-sm font-medium text-gray-700">
              {tables.length} table{tables.length !== 1 ? 's' : ''} on this
              floor
            </p>
            <p className="text-xs text-gray-500">
              Layout management only. Occupied status is shown as read-only.
            </p>
          </div>

          <div className="text-xs text-gray-500">
            Drag tables to reposition
          </div>
        </div>

        <div
          ref={mapRef}
          className="relative h-150 overflow-hidden bg-gray-50"
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
        >
          {tables.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <PlusIcon className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                <p className="mb-2 text-sm font-medium text-gray-600">
                  No tables on this floor yet.
                </p>
                <p className="text-xs text-gray-400">
                  Click Add Table to start building your layout.
                </p>
              </div>
            </div>
          ) : (
            tables.map((table) => {
              const positionX = table.position_x ?? 0;
              const positionY = table.position_y ?? 0;
              const isDragging = dragState?.tableId === table.id;

              return (
                <div
                  key={table.id}
                  className="absolute cursor-move select-none"
                  style={{
                    left: `${positionX}px`,
                    top: `${positionY}px`,
                    zIndex: isDragging ? 50 : 10,
                  }}
                  onMouseDown={(event) => handleDragStart(table, event)}
                >
                  <TableCard
                    table={table}
                    onEdit={() => handleEditTable(table)}
                    onDelete={() => handleDelete(table)}
                    onShowQR={() => handleShowQR(table)}
                    isDragging={isDragging}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      <QRCodeModal
        isOpen={isQRModalOpen}
        onClose={handleCloseQR}
        table={qrTable}
      />
    </>
  );
}