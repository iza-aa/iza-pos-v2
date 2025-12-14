/**
 * Table Editor Modal
 * Form for creating/editing tables
 */

'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, QrCodeIcon } from '@heroicons/react/24/outline';

interface TableEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  table?: any;
  floorId: string | null;
}

export default function TableEditor({
  isOpen,
  onClose,
  onSave,
  table,
  floorId,
}: TableEditorProps) {
  const [formData, setFormData] = useState({
    table_number: '',
    capacity: 4,
    shape: 'round',
    position_x: 100,
    position_y: 100,
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [generatingQR, setGeneratingQR] = useState(false);

  useEffect(() => {
    if (table) {
      setFormData({
        table_number: table.table_number || '',
        capacity: table.capacity || 4,
        shape: table.shape || 'round',
        position_x: table.position_x || 100,
        position_y: table.position_y || 100,
        notes: table.notes || '',
      });
    } else {
      setFormData({
        table_number: '',
        capacity: 4,
        shape: 'round',
        position_x: 100,
        position_y: 100,
        notes: '',
      });
    }
  }, [table, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = table
        ? `/api/manager/tables/${table.id}`
        : '/api/manager/tables';
      
      const method = table ? 'PATCH' : 'POST';
      
      const body = table
        ? formData
        : { ...formData, floor_id: floorId };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        onSave();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save table');
      }
    } catch (error) {
      console.error('Error saving table:', error);
      alert('Failed to save table');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQR = async () => {
    if (!table?.id || !formData.table_number) return;

    setGeneratingQR(true);
    try {
      const response = await fetch('/api/manager/qr/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: table.id,
          table_number: formData.table_number,
        }),
      });

      if (response.ok) {
        alert('QR code generated successfully!');
        onSave();
      } else {
        alert('Failed to generate QR code');
      }
    } catch (error) {
      console.error('Error generating QR:', error);
      alert('Failed to generate QR code');
    } finally {
      setGeneratingQR(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              {table ? 'Edit Table' : 'Create New Table'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            {/* Table Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Table Number *
              </label>
              <input
                type="text"
                required
                value={formData.table_number}
                onChange={(e) =>
                  setFormData({ ...formData, table_number: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="e.g., T1, A1, Table 1"
              />
            </div>

            {/* Capacity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacity *
              </label>
              <input
                type="number"
                required
                min="1"
                max="20"
                value={formData.capacity}
                onChange={(e) =>
                  setFormData({ ...formData, capacity: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>

            {/* Shape */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shape
              </label>
              <select
                value={formData.shape}
                onChange={(e) =>
                  setFormData({ ...formData, shape: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="round">Round</option>
                <option value="square">Square</option>
                <option value="rectangular">Rectangular</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="Additional notes about this table"
              />
            </div>

            {/* QR Code Section (Edit Mode Only) */}
            {table && (
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    QR Code
                  </span>
                  {table.qr_code_url && (
                    <a
                      href={table.qr_code_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      View QR
                    </a>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleGenerateQR}
                  disabled={generatingQR}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  <QrCodeIcon className="h-5 w-5 mr-2" />
                  {generatingQR
                    ? 'Generating...'
                    : table.qr_code_url
                    ? 'Regenerate QR Code'
                    : 'Generate QR Code'}
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? 'Saving...' : table ? 'Save Changes' : 'Create Table'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
