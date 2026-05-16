'use client';

import { FormEvent, useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/lib/config/supabaseClient';

interface FloorEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

interface SupabaseErrorLike {
  code?: string;
  message?: string;
  details?: string;
}

export default function FloorEditor({
  isOpen,
  onClose,
  onSave,
}: FloorEditorProps) {
  const [name, setName] = useState('');
  const [floorNumber, setFloorNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setName('');
    setFloorNumber('');
    setErrorMessage(null);
    setIsSaving(false);
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const getFriendlyErrorMessage = (error: SupabaseErrorLike) => {
    const rawMessage = `${error.code ?? ''} ${error.message ?? ''} ${
      error.details ?? ''
    }`.toLowerCase();

    if (
      error.code === '23505' ||
      rawMessage.includes('unique_active_floor_name') ||
      rawMessage.includes('unique_active_floor_number') ||
      rawMessage.includes('duplicate key')
    ) {
      return 'Floor name or floor number already exists.';
    }

    return error.message ?? 'Failed to save floor.';
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    const parsedFloorNumber = Number(floorNumber);

    if (!trimmedName) {
      setErrorMessage('Floor name is required.');
      return;
    }

    if (!Number.isInteger(parsedFloorNumber) || parsedFloorNumber <= 0) {
      setErrorMessage('Floor number must be a positive number.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.from('floors').insert({
        name: trimmedName,
        floor_number: parsedFloorNumber,
        is_active: true,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        throw error;
      }

      onSave();
    } catch (error) {
      const message =
        typeof error === 'object' && error !== null
          ? getFriendlyErrorMessage(error as SupabaseErrorLike)
          : 'Failed to save floor.';

      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Add Floor</h2>
            <p className="text-sm text-gray-500">
              Create a new active floor for table layout management.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Close floor editor"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          {errorMessage ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <div>
            <label
              htmlFor="floor-name"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Floor Name
            </label>
            <input
              id="floor-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Example: Third Floor"
              disabled={isSaving}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 disabled:bg-gray-100"
            />
          </div>

          <div>
            <label
              htmlFor="floor-number"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Floor Number
            </label>
            <input
              id="floor-number"
              type="number"
              min={1}
              value={floorNumber}
              onChange={(event) => setFloorNumber(event.target.value)}
              placeholder="Example: 3"
              disabled={isSaving}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 disabled:bg-gray-100"
            />
            <p className="mt-1 text-xs text-gray-500">
              Floor number must be unique for active floors.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {isSaving ? 'Saving...' : 'Save Floor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}