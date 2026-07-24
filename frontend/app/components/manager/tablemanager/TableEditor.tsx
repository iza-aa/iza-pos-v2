/**
 * Table Editor Modal
 * Form for creating/editing tables
 */

'use client';

import { FormEvent, useEffect, useState } from 'react';
import { QrCodeIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/app/components/shared/i18n';
import { showSuccess } from '@/lib/services/errorHandling';

interface EditableTable {
  id: string;
  table_number: string;
  floor_id?: string | null;
  capacity: number;
  shape?: string | null;
  status?: string | null;
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

interface TableEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  table: EditableTable | null;
  floorId: string | null;
}

interface TableFormData {
  table_number: string;
  capacity: number;
  shape: string;
  position_x: number;
  position_y: number;
  notes: string;
}

interface ApiErrorResponse {
  error?: string;
  message?: string;
  details?: string;
}

const DEFAULT_FORM_DATA: TableFormData = {
  table_number: '',
  capacity: 4,
  shape: 'round',
  position_x: 100,
  position_y: 100,
  notes: '',
};

export default function TableEditor({
  isOpen,
  onClose,
  onSave,
  table,
  floorId,
}: TableEditorProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<TableFormData>(DEFAULT_FORM_DATA);
  const [loading, setLoading] = useState(false);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isEditMode = Boolean(table?.id);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setErrorMessage(null);
    setLoading(false);
    setGeneratingQR(false);

    if (table) {
      setFormData({
        table_number: table.table_number ?? '',
        capacity: table.capacity ?? 4,
        shape: table.shape ?? 'round',
        position_x: table.position_x ?? 100,
        position_y: table.position_y ?? 100,
        notes: table.notes ?? '',
      });

      return;
    }

    setFormData(DEFAULT_FORM_DATA);
  }, [table, isOpen]);

  if (!isOpen) {
    return null;
  }

  const getApiErrorMessage = async (response: Response) => {
    const fallbackMessage = isEditMode
      ? t('manager.table.updateFailed')
      : t('manager.table.createFailed');

    try {
      const errorBody = (await response.json()) as ApiErrorResponse;

      const rawMessage = `${errorBody.error ?? ''} ${errorBody.message ?? ''} ${
        errorBody.details ?? ''
      }`.toLowerCase();

      if (
        rawMessage.includes('unique_active_table_number_per_floor') ||
        rawMessage.includes('duplicate key') ||
        rawMessage.includes('already exists')
      ) {
        return t('manager.table.tableDuplicate');
      }

      return errorBody.error || errorBody.message || fallbackMessage;
    } catch {
      return fallbackMessage;
    }
  };

  const validateForm = () => {
    const trimmedTableNumber = formData.table_number.trim();

    if (!trimmedTableNumber) {
      return t('manager.table.tableNumberRequired');
    }

    if (!Number.isInteger(formData.capacity) || formData.capacity < 1) {
      return t('manager.table.capacityMin');
    }

    if (formData.capacity > 20) {
      return t('manager.table.capacityMax');
    }

    if (!['round', 'square', 'rectangular'].includes(formData.shape)) {
      return t('manager.table.invalidShape');
    }

    if (!isEditMode && !floorId) {
      return t('manager.table.selectFloorFirst');
    }

    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const payload = {
      table_number: formData.table_number.trim(),
      capacity: formData.capacity,
      shape: formData.shape,
      position_x: formData.position_x,
      position_y: formData.position_y,
      notes: formData.notes.trim() || null,
      ...(isEditMode ? {} : { floor_id: floorId }),
    };

    try {
      const url = isEditMode
        ? `/api/manager/tables/${table?.id}`
        : '/api/manager/tables';

      const response = await fetch(url, {
        method: isEditMode ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await getApiErrorMessage(response);
        throw new Error(message);
      }

      onSave();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : isEditMode
          ? t('manager.table.updateFailed')
          : t('manager.table.createFailed');

      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQR = async () => {
    if (!table?.id || !formData.table_number.trim()) {
      return;
    }

    setGeneratingQR(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/manager/qr/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          table_id: table.id,
          table_number: formData.table_number.trim(),
        }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as ApiErrorResponse;
        throw new Error(
          errorBody.message || errorBody.error || t('manager.table.qrGenerateFailed'),
        );
      }

      showSuccess(t('manager.table.qrGenerated'));
      onSave();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('manager.table.qrGenerateFailed');

      setErrorMessage(message);
    } finally {
      setGeneratingQR(false);
    }
  };

  const handleCapacityChange = (value: string) => {
    const parsedValue = Number(value);

    setFormData((previous) => ({
      ...previous,
      capacity: Number.isNaN(parsedValue) ? 1 : parsedValue,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 py-8 text-center">
        <button
          type="button"
          className="fixed inset-0 bg-gray-500/75"
          onClick={onClose}
          aria-label={t('manager.table.closeTableEditorOverlay')}
        />

        <div className="relative w-full max-w-lg overflow-hidden rounded-lg bg-white text-left shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {isEditMode ? t('manager.table.editTable') : t('manager.table.createTable')}
              </h3>
              <p className="text-sm text-gray-500">
                {isEditMode
                  ? t('manager.table.editTableDescription')
                  : t('manager.table.createTableDescription')}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={loading || generatingQR}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label={t('manager.table.closeTableEditor')}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
            {errorMessage ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}

            {isEditMode && table?.status ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                {t('manager.table.currentStatus')} <strong className="capitalize">{table.status}</strong>.
                {' '}{t('manager.table.statusManagedElsewhere')}
              </div>
            ) : null}

            <div>
              <label
                htmlFor="table-number"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                {t('manager.table.tableNumber')} *
              </label>
              <input
                id="table-number"
                type="text"
                required
                value={formData.table_number}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    table_number: event.target.value,
                  }))
                }
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 disabled:bg-gray-100"
                placeholder={t('manager.table.tableNumberPlaceholder')}
              />
            </div>

            <div>
              <label
                htmlFor="capacity"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                {t('manager.table.capacity')} *
              </label>
              <input
                id="capacity"
                type="number"
                required
                min={1}
                max={20}
                value={formData.capacity}
                onChange={(event) => handleCapacityChange(event.target.value)}
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label
                htmlFor="shape"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                {t('manager.table.shape')}
              </label>
              <select
                id="shape"
                value={formData.shape}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    shape: event.target.value,
                  }))
                }
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 disabled:bg-gray-100"
              >
                <option value="round">{t('manager.table.shapeRound')}</option>
                <option value="square">{t('manager.table.shapeSquare')}</option>
                <option value="rectangular">{t('manager.table.shapeRectangular')}</option>
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="position-x"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  {t('manager.table.positionX')}
                </label>
                <input
                  id="position-x"
                  type="number"
                  min={0}
                  value={formData.position_x}
                  onChange={(event) =>
                    setFormData((previous) => ({
                      ...previous,
                      position_x: Number(event.target.value),
                    }))
                  }
                  disabled={loading}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label
                  htmlFor="position-y"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  {t('manager.table.positionY')}
                </label>
                <input
                  id="position-y"
                  type="number"
                  min={0}
                  value={formData.position_y}
                  onChange={(event) =>
                    setFormData((previous) => ({
                      ...previous,
                      position_y: Number(event.target.value),
                    }))
                  }
                  disabled={loading}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 disabled:bg-gray-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="notes"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                {t('manager.table.notes')}
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    notes: event.target.value,
                  }))
                }
                rows={3}
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 disabled:bg-gray-100"
                placeholder={t('manager.table.notesPlaceholder')}
              />
            </div>

              {isEditMode ? (
                <div className="border-t border-gray-200 pt-4">
                  <div className="mb-2">
                    <span className="text-sm font-medium text-gray-700">{t('manager.table.qrCode')}</span>
                    <p className="mt-1 text-xs text-gray-500">
                      {t('manager.table.qrHelper')}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateQR}
                    disabled={generatingQR || loading}
                    className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <QrCodeIcon className="mr-2 h-5 w-5" />
                    {generatingQR
                      ? t('manager.table.generating')
                      : table?.qr_code_url
                      ? t('manager.table.regenerateQr')
                      : t('manager.table.generateQr')}
                  </button>
                </div>
              ) : null}

            <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-4 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                disabled={loading || generatingQR}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t('common.cancel')}
              </button>

              <button
                type="submit"
                disabled={loading || generatingQR}
                className="flex-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {loading
                  ? t('common.saving')
                  : isEditMode
                  ? t('manager.table.saveChanges')
                  : t('manager.table.createTable')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
