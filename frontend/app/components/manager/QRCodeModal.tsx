/**
 * QR Code Modal Component
 * Display and download QR codes for tables
 */

'use client';

import { XMarkIcon, ArrowDownTrayIcon, PrinterIcon } from '@heroicons/react/24/outline';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: {
    table_number: string;
    qr_code_url: string;
    qr_customer_url?: string;
  } | null;
}

export default function QRCodeModal({
  isOpen,
  onClose,
  table,
}: QRCodeModalProps) {
  if (!isOpen || !table) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = table.qr_code_url;
    link.download = `table-${table.table_number}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

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
              QR Code - Table {table.table_number}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {/* QR Code Image */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-6 mb-4">
              <img
                src={table.qr_code_url}
                alt={`QR Code for Table ${table.table_number}`}
                className="w-full h-auto"
              />
            </div>

            {/* Customer URL */}
            {table.qr_customer_url && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer URL
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    readOnly
                    value={table.qr_customer_url}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 text-sm"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(table.qr_customer_url || '');
                      alert('URL copied to clipboard!');
                    }}
                    className="px-4 py-2 bg-gray-900 text-white rounded-r-lg hover:bg-gray-800 text-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-900">
                <strong>Instructions:</strong> Print this QR code and place it on
                Table {table.table_number}. Customers can scan it to view the menu
                and place orders.
              </p>
            </div>

            {/* Actions */}
            <div className="flex space-x-3">
              <button
                onClick={handleDownload}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                Download
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-gray-900 hover:bg-gray-800"
              >
                <PrinterIcon className="h-5 w-5 mr-2" />
                Print
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
