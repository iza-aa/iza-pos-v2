/**
 * Table Management Page
 * Manager interface for managing restaurant tables, floors, and QR codes
 */

'use client';

import { useState } from 'react';
import {
  BuildingOffice2Icon,
  MapIcon,
  PlusIcon,
  TableCellsIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { supabase } from '@/lib/config/supabaseClient';
import {
  FloorSelector,
  RestaurantMap,
  TableList,
  TableEditor,
  FloorEditor,
} from '@/app/components/manager/tablemanager';

type ViewMode = 'map' | 'list';

interface EditableTable {
  id: string;
  table_number: string;
  capacity: number;
  shape?: string | null;
  status?: string | null;
  floor_id?: string | null;
  qr_code_url?: string | null;
  qr_code_image?: string | null;
  qr_generated_at?: string | null;
  position_x?: number | null;
  position_y?: number | null;
  current_order_id?: string | null;
  occupied_at?: string | null;
  occupied_by_customer?: string | null;
  is_active?: boolean | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface FloorTableCheck {
  id: string;
  table_number: string;
  status: string | null;
  current_order_id: string | null;
}

export default function TableManagementPage() {
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [isTableEditorOpen, setIsTableEditorOpen] = useState(false);
  const [isFloorEditorOpen, setIsFloorEditorOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<EditableTable | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isDeletingFloor, setIsDeletingFloor] = useState(false);

  const handleTableCreate = () => {
    if (!selectedFloor) return;

    setEditingTable(null);
    setIsTableEditorOpen(true);
  };

  const handleTableEdit = (table: EditableTable) => {
    setEditingTable(table);
    setIsTableEditorOpen(true);
  };

  const handleTableSaved = () => {
    setIsTableEditorOpen(false);
    setEditingTable(null);
    setRefreshKey((prev) => prev + 1);
  };

  const handleFloorSaved = () => {
    setIsFloorEditorOpen(false);
    setRefreshKey((prev) => prev + 1);
  };

  const handleTableEditorClose = () => {
    setIsTableEditorOpen(false);
    setEditingTable(null);
  };

  const handleFloorEditorClose = () => {
    setIsFloorEditorOpen(false);
  };

  const handleDeleteFloor = async () => {
    if (!selectedFloor || isDeletingFloor) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this floor? All tables on this floor will also be hidden. This action uses soft delete.'
    );

    if (!confirmed) return;

    setIsDeletingFloor(true);

    try {
      const { data: tablesOnFloor, error: checkTablesError } = await supabase
        .from('tables')
        .select('id, table_number, status, current_order_id')
        .eq('floor_id', selectedFloor)
        .eq('is_active', true);

      if (checkTablesError) {
        throw checkTablesError;
      }

      const activeTables = (tablesOnFloor ?? []) as FloorTableCheck[];

      const busyTables = activeTables.filter((table) => {
        const status = table.status?.toLowerCase();

        return status === 'occupied' || Boolean(table.current_order_id);
      });

      if (busyTables.length > 0) {
        const busyTableNumbers = busyTables
          .map((table) => table.table_number)
          .join(', ');

        window.alert(
          `Floor cannot be deleted because there are active tables: ${busyTableNumbers}. Please complete or clear the active orders first.`
        );

        return;
      }

      const now = new Date().toISOString();

      const { error: deleteTablesError } = await supabase
        .from('tables')
        .update({
          is_active: false,
          updated_at: now,
        })
        .eq('floor_id', selectedFloor)
        .eq('is_active', true);

      if (deleteTablesError) {
        throw deleteTablesError;
      }

      const { error: deleteFloorError } = await supabase
        .from('floors')
        .update({
          is_active: false,
          updated_at: now,
        })
        .eq('id', selectedFloor);

      if (deleteFloorError) {
        throw deleteFloorError;
      }

      setSelectedFloor(null);
      setRefreshKey((prev) => prev + 1);

      window.alert('Floor deleted successfully.');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown error while deleting floor.';

      console.error('Failed to delete floor:', error);
      window.alert(`Failed to delete floor: ${message}`);
    } finally {
      setIsDeletingFloor(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center space-x-3">
              <BuildingOffice2Icon className="h-8 w-8 text-gray-900" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Table Management
                </h1>
                <p className="text-sm text-gray-500">
                  Manage restaurant layout, tables, and QR codes
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* View Toggle */}
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setViewMode('map')}
                  className={`px-2 py-2 text-sm font-medium transition-colors ${
                    viewMode === 'map'
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <MapIcon className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-2 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
                    viewMode === 'list'
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <TableCellsIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Add Floor Button */}
              <button
                type="button"
                onClick={() => setIsFloorEditorOpen(true)}
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Floor
              </button>

              {/* Delete Floor Button */}
              <button
                type="button"
                onClick={handleDeleteFloor}
                disabled={!selectedFloor || isDeletingFloor}
                className="inline-flex items-center justify-center px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-white hover:bg-red-50 transition-colors disabled:text-gray-400 disabled:border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <TrashIcon className="h-5 w-5 mr-2" />
                {isDeletingFloor ? 'Deleting...' : 'Delete Floor'}
              </button>

              {/* Add Table Button */}
              <button
                type="button"
                onClick={handleTableCreate}
                disabled={!selectedFloor}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Table
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floor Selector */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <FloorSelector
            selectedFloor={selectedFloor}
            onFloorChange={setSelectedFloor}
            refreshKey={refreshKey}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!selectedFloor ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <BuildingOffice2Icon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Floor Selected
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Select a floor to view and manage tables.
            </p>
            <button
              type="button"
              onClick={() => setIsFloorEditorOpen(true)}
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create First Floor
            </button>
          </div>
        ) : viewMode === 'map' ? (
          <RestaurantMap
            floorId={selectedFloor}
            onTableEdit={handleTableEdit}
            refreshKey={refreshKey}
          />
        ) : (
          <TableList
            floorId={selectedFloor}
            onTableEdit={handleTableEdit}
            refreshKey={refreshKey}
          />
        )}
      </div>

      {/* Modals */}
      <TableEditor
        isOpen={isTableEditorOpen}
        onClose={handleTableEditorClose}
        onSave={handleTableSaved}
        table={editingTable}
        floorId={selectedFloor}
      />

      <FloorEditor
        isOpen={isFloorEditorOpen}
        onClose={handleFloorEditorClose}
        onSave={handleFloorSaved}
      />
    </div>
  );
}