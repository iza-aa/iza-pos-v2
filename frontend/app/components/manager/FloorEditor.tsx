/**
 * Floor Editor Modal
 * Form for creating new floors
 */

'use client';

import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface FloorEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function FloorEditor({
  isOpen,
  onClose,
  onSave,
}: FloorEditorProps) {
  const [formData, setFormData] = useState({
    name: '',
    floor_number: 1,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/manager/floors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setFormData({ name: '', floor_number: 1 });
        onSave();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create floor');
      }
    } catch (error) {
      console.error('Error creating floor:', error);
      alert('Failed to create floor');
    } finally {
      setLoading(false);
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
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
          {/* Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Create New Floor
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
            {/* Floor Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Floor Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="e.g., Ground Floor, First Floor"
              />
            </div>

            {/* Floor Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Floor Number *
              </label>
              <input
                type="number"
                required
                value={formData.floor_number}
                onChange={(e) =>
                  setFormData({ ...formData, floor_number: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use negative numbers for basement levels (e.g., -1, -2)
              </p>
            </div>

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
                {loading ? 'Creating...' : 'Create Floor'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
