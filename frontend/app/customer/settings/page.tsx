/**
 * Customer Settings Page
 * Manage table selection and preferences
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRightOnRectangleIcon,
  QrCodeIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

export default function CustomerSettings() {
  const router = useRouter();
  const [tableInfo, setTableInfo] = useState<any>(null);

  useEffect(() => {
    const storedTable = sessionStorage.getItem('customer_table');
    if (storedTable) {
      setTableInfo(JSON.parse(storedTable));
    }
  }, []);

  const handleChangeTable = () => {
    // Clear current table
    sessionStorage.removeItem('customer_table');
    router.push('/customer/table');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
      </div>

      {/* Current Table Section */}
      {tableInfo && (
        <div className="px-4 py-4">
          <div className="max-w-lg mx-auto">
            <h2 className="text-sm font-medium text-gray-700 mb-3">
              Current Table
            </h2>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-lg font-bold text-gray-900">
                    {tableInfo.table_number}
                  </div>
                  {tableInfo.floor_name && (
                    <div className="text-sm text-gray-500">
                      {tableInfo.floor_name}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    Capacity: {tableInfo.capacity} people
                  </div>
                </div>
                <div className="bg-gray-100 rounded-full p-3">
                  <QrCodeIcon className="h-6 w-6 text-gray-600" />
                </div>
              </div>

              <button
                onClick={handleChangeTable}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
                Change Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* App Info */}
      <div className="px-4 py-4">
        <div className="max-w-lg mx-auto">
          <h2 className="text-sm font-medium text-gray-700 mb-3">
            About
          </h2>
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
            <div className="p-4 flex items-center justify-between">
              <span className="text-sm text-gray-900">Version</span>
              <span className="text-sm text-gray-500">1.0.0</span>
            </div>
            <div className="p-4 flex items-center justify-between">
              <span className="text-sm text-gray-900">App Type</span>
              <span className="text-sm text-gray-500">QR Self-Ordering</span>
            </div>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="px-4 py-4">
        <div className="max-w-lg mx-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-blue-900 mb-1">
                  How to Use
                </h3>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Scan QR code or enter table number</li>
                  <li>• Browse menu and add items to cart</li>
                  <li>• Place order and track status</li>
                  <li>• Call staff if you need assistance</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-6">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-xs text-gray-500">
            Made with ❤️ for better dining experience
          </p>
        </div>
      </div>
    </div>
  );
}
