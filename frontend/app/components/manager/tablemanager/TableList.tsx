/**
 * Table List Component
 * Table view for managing restaurant tables
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  PencilIcon,
  QrCodeIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import QRCodeModal from './QRCodeModal';

interface Table {
  id: string;
  table_number: string;
  floor_id?: string | null;
  capacity: number;
  shape: string | null;
  status: string | null;
  position_x?: number | null;
  position_y?: number | null;
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
  const [qrTable, setQrTable] = useState<Table | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

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

  const handleShowQR = (table: Table) => {
    setQrTable(table);
    setIsQRModalOpen(true);
  };

  const handleCloseQR = () => {
    setQrTable(null);
    setIsQRModalOpen(false);
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

    if (!confirmed) return;

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

  const getStatusBadgeClass = (status: string | null) => {
    const normalizedStatus = status?.toLowerCase() ?? 'free';

    const statusClasses: Record<string, string> = {
      free: 'bg-gray-100 text-gray-700 border-gray-200',
      occupied: 'bg-red-50 text-red-700 border-red-200',
      reserved: 'bg-amber-50 text-amber-700 border-amber-200',
      cleaning: 'bg-blue-50 text-blue-700 border-blue-200',
      maintenance: 'bg-gray-200 text-gray-800 border-gray-300',
    };

    return statusClasses[normalizedStatus] || statusClasses.free;
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
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Tables</h2>
          <p className="text-sm text-gray-500">
            Layout and QR management. Table status is read-only here.
          </p>
        </div>

        {tables.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-gray-700">
              No tables on this floor yet.
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Click Add Table to start building your layout.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Table
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Capacity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Shape
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    QR Code
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 bg-white">
                {tables.map((table) => {
                  const normalizedStatus =
                    table.status?.toLowerCase() ?? 'free';
                  const hasQR = Boolean(table.qr_code_url || table.qr_code_image);
                  const isBusy =
                    normalizedStatus === 'occupied' ||
                    Boolean(table.current_order_id);

                  return (
                    <tr key={table.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {table.table_number}
                        </div>
                        {table.occupied_by_customer ? (
                          <div className="text-xs text-gray-500">
                            {table.occupied_by_customer}
                          </div>
                        ) : null}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                        {table.capacity}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm capitalize text-gray-700">
                        {table.shape ?? '-'}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium capitalize ${getStatusBadgeClass(
                            table.status
                          )}`}
                        >
                          {normalizedStatus}
                        </span>
                      </td>


                      <td className="whitespace-nowrap px-6 py-4">
                        {hasQR ? (
                          <button
                            type="button"
                            onClick={() => handleShowQR(table)}
                            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
                          >
                            <QrCodeIcon className="mr-1 h-4 w-4" />
                            View
                          </button>
                        ) : (
                          <span className="text-sm text-gray-400">
                            Not generated
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onTableEdit(table)}
                            className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <PencilIcon className="mr-1 h-4 w-4" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(table)}
                            disabled={isBusy}
                            className={`inline-flex items-center rounded-lg px-3 py-1.5 text-sm ${
                              isBusy
                                ? 'cursor-not-allowed border border-gray-300 bg-gray-100 text-gray-400'
                                : 'border border-red-300 text-red-700 hover:bg-red-50'
                            }`}
                            title={
                              isBusy
                                ? 'Cannot delete an occupied table'
                                : `Delete table ${table.table_number}`
                            }
                          >
                            <TrashIcon className="mr-1 h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <QRCodeModal
        isOpen={isQRModalOpen}
        onClose={handleCloseQR}
        table={qrTable}
      />
    </>
  );
}