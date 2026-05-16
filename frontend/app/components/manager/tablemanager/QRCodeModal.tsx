/**
 * QR Code Modal Component
 * Display and download QR codes for tables
 */

'use client';

import {
  ArrowDownTrayIcon,
  PrinterIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface QRCodeTable {
  table_number: string;
  qr_code_url?: string | null;
  qr_code_image?: string | null;
  qr_generated_at?: string | null;
}

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: QRCodeTable | null;
}

export default function QRCodeModal({
  isOpen,
  onClose,
  table,
}: QRCodeModalProps) {
  if (!isOpen || !table) {
    return null;
  }

  const qrImageUrl = table.qr_code_image || table.qr_code_url || '';
  const customerUrl = table.qr_code_url || '';

  const handleDownload = () => {
    if (!qrImageUrl) {
      window.alert('QR image is not available.');
      return;
    }

    const link = document.createElement('a');
    link.href = qrImageUrl;
    link.download = `table-${table.table_number}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyUrl = async () => {
    if (!customerUrl) {
      window.alert('Customer URL is not available.');
      return;
    }

    try {
      await navigator.clipboard.writeText(customerUrl);
      window.alert('URL copied to clipboard.');
    } catch {
      window.alert('Failed to copy URL.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 py-8 text-center">
        <button
          type="button"
          className="fixed inset-0 bg-gray-500/75"
          onClick={onClose}
          aria-label="Close QR modal overlay"
        />

        <div className="relative w-full max-w-md overflow-hidden rounded-lg bg-white text-left shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                QR Code - Table {table.table_number}
              </h3>
              {table.qr_generated_at ? (
                <p className="text-xs text-gray-500">
                  Generated at{' '}
                  {new Date(table.qr_generated_at).toLocaleString()}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close QR modal"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="px-6 py-6">
            <div className="mb-4 rounded-lg border-2 border-gray-200 bg-white p-6">
              {qrImageUrl ? (
                <img
                  src={qrImageUrl}
                  alt={`QR Code for Table ${table.table_number}`}
                  className="h-auto w-full"
                />
              ) : (
                <div className="flex h-64 items-center justify-center rounded-lg bg-gray-50 text-center text-sm text-gray-500">
                  QR image is not available for this table.
                </div>
              )}
            </div>

            {customerUrl ? (
              <div className="mb-6">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Customer URL
                </label>

                <div className="flex items-center">
                  <input
                    type="text"
                    readOnly
                    value={customerUrl}
                    className="flex-1 rounded-l-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
                  />

                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="rounded-r-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800"
                  >
                    Copy
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                <strong>Instructions:</strong> Print this QR code and place it
                on Table {table.table_number}. Customers can scan it to open
                the menu and place orders.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDownload}
                disabled={!qrImageUrl}
                className="inline-flex flex-1 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowDownTrayIcon className="mr-2 h-5 w-5" />
                Download
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={!qrImageUrl}
                className="inline-flex flex-1 items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                <PrinterIcon className="mr-2 h-5 w-5" />
                Print
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}