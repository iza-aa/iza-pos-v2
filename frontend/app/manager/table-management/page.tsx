/**
 * Table Management Page
 * Manager interface for managing restaurant tables, floors, and QR codes
 */

'use client';

import { useState } from 'react';
import { BuildingOffice2Icon, PlusIcon } from '@heroicons/react/24/outline';
import {
  FloorSelector,
  RestaurantMap,
  TableList,
  TableEditor,
  FloorEditor,
  QRCodeModal
} from '@/app/components/manager';

export default function TableManagementPage() {
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [isTableEditorOpen, setIsTableEditorOpen] = useState(false);
  const [isFloorEditorOpen, setIsFloorEditorOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTableCreate = () => {
    setEditingTable(null);
    setIsTableEditorOpen(true);
  };

  const handleTableEdit = (table: any) => {
    setEditingTable(table);
    setIsTableEditorOpen(true);
  };

  const handleTableSaved = () => {
    setIsTableEditorOpen(false);
    setEditingTable(null);
    setRefreshKey(prev => prev + 1);
  };

  const handleFloorSaved = () => {
    setIsFloorEditorOpen(false);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
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

            <div className="flex items-center space-x-3">
              {/* View Toggle */}
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    viewMode === 'map'
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Map View
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
                    viewMode === 'list'
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  List View
                </button>
              </div>

              {/* Add Floor Button */}
              <button
                onClick={() => setIsFloorEditorOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Floor
              </button>

              {/* Add Table Button */}
              <button
                onClick={handleTableCreate}
                disabled={!selectedFloor}
                className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <FloorSelector
            selectedFloor={selectedFloor}
            onFloorChange={setSelectedFloor}
            refreshKey={refreshKey}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!selectedFloor ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <BuildingOffice2Icon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Floor Selected
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Select a floor to view and manage tables
            </p>
            <button
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
        onClose={() => {
          setIsTableEditorOpen(false);
          setEditingTable(null);
        }}
        onSave={handleTableSaved}
        table={editingTable}
        floorId={selectedFloor}
      />

      <FloorEditor
        isOpen={isFloorEditorOpen}
        onClose={() => setIsFloorEditorOpen(false)}
        onSave={handleFloorSaved}
      />
    </div>
  );
}
