/**
 * Table List Component
 * List view of tables with actions
 */

'use client';

import { useEffect, useState } from 'react';
import { QrCodeIcon, PencilIcon, TrashIcon, UserGroupIcon } from '@heroicons/react/24/outline';

interface Table {
  id: string;
  table_number: string;
  capacity: number;
  shape: string;
  status: string;
  qr_code_url?: string;
  qr_generated_at?: string;
  floor_name?: string;
}

interface TableListProps {
  floorId: string;
  onTableEdit: (table: Table) => void;
  refreshKey?: number;
}

export default function TableList({
  floorId,
  onTableEdit,
  refreshKey = 0,
}: TableListProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleDelete = async (tableId: string) => {
    if (!confirm('Are you sure you want to delete this table?')) return;

    try {
      const response = await fetch(`/api/manager/tables/${tableId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchTables();
      }
    } catch (error) {
      console.error('Error deleting table:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const classes = {
      free: 'bg-green-100 text-green-800',
      occupied: 'bg-red-100 text-red-800',
      reserved: 'bg-amber-100 text-amber-800',
      cleaning: 'bg-blue-100 text-blue-800',
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${
          classes[status as keyof typeof classes] || classes.free
        }`}
      >
        {status}
      </span>
    );
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
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Table
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Capacity
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Shape
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              QR Code
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {tables.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                No tables on this floor. Click "Add Table" to create one.
              </td>
            </tr>
          ) : (
            tables.map((table) => (
              <tr key={table.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {table.table_number}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900">
                    <UserGroupIcon className="h-4 w-4 mr-1 text-gray-400" />
                    {table.capacity}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-500 capitalize">
                    {table.shape}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(table.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {table.qr_code_url ? (
                    <a
                      href={table.qr_code_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
                    >
                      <QrCodeIcon className="h-4 w-4 mr-1" />
                      View
                    </a>
                  ) : (
                    <span className="text-sm text-gray-400">Not generated</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => onTableEdit(table)}
                    className="text-gray-600 hover:text-gray-900 mr-3"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(table.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
