/**
 * Customer Table Entry Page
 * Only accepts QR code URL parameter from physical QR scan
 * No manual scanner - customers must scan physical QR at their table
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { QrCodeIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function CustomerTablePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasExistingSession, setHasExistingSession] = useState(false);
  const hasRedirected = useRef(false);

  // Check if table parameter exists in URL or existing session
  useEffect(() => {
    if (hasRedirected.current) return; // Already redirected

    // Check existing session first - IMMEDIATE redirect
    const existingTable = localStorage.getItem('customer_table');
    if (existingTable) {
      try {
        const tableData = JSON.parse(existingTable);
        if (tableData && tableData.id) {
          // Has valid session - redirect immediately without API call
          hasRedirected.current = true;
          setHasExistingSession(true);
          setLoading(true);
          window.location.replace('/customer/menu');
          return;
        } else {
          // Invalid data, clear it
          localStorage.removeItem('customer_table');
          localStorage.removeItem('customer_cart');
          localStorage.removeItem('customer_name');
        }
      } catch (e) {
        // Parse error, clear corrupt data
        console.error('Failed to parse table session:', e);
        localStorage.removeItem('customer_table');
        localStorage.removeItem('customer_cart');
        localStorage.removeItem('customer_name');
      }
    }

    // Check URL parameter (from QR scan)
    const table = searchParams.get('table');
    if (table && !hasRedirected.current) {
      validateAndSetTable(table);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount



  const validateAndSetTable = async (tableNum: string) => {
    if (hasRedirected.current) return; // Already redirected
    
    setLoading(true);
    setError('');

    try {
      // Validate table exists and is available
      const response = await fetch(`/api/customer/validate-table?table_number=${tableNum}`);
      const result = await response.json();

      if (result.success && result.data) {
        // Store table info in localStorage (persistent) - SYNC operation
        localStorage.setItem('customer_table', JSON.stringify(result.data));
        localStorage.setItem('table_session_start', new Date().toISOString());
        
        // Hard navigate to menu to break any loops
        hasRedirected.current = true;
        window.location.replace('/customer/menu');
      } else {
        setLoading(false);
        setError(result.error || 'Invalid table number');
      }
    } catch (err) {
      console.error('Error validating table:', err);
      setLoading(false);
      setError('Failed to validate table. Please try again.');
    }
  };



  // Show loading screen with logo during validation
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="text-center">
          {/* Logo */}
          {/* Loading Animation */}
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>

          {/* Loading Text */}
          <p className="text-white text-lg font-medium">
            {hasExistingSession ? 'Checking your session...' : 'Validating table...'}
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Please wait a moment
          </p>
        </div>
      </div>
    );
  }

  // Show message to scan QR from physical table (no scanner UI)
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          {/* Icon */}
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <QrCodeIcon className="w-10 h-10 text-gray-700" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Scan QR Code
          </h1>

          {/* Message */}
          <p className="text-gray-600 mb-6">
            Please scan the QR code on your table to access our menu and place your order.
          </p>

          {/* Security Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <QrCodeIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-sm font-medium text-blue-900 mb-1">
                  🔒 Secure Access
                </p>
                <p className="text-xs text-blue-700">
                  Each table has a unique QR code. Scan it to ensure your order is delivered to the correct table.
                </p>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 text-left">{error}</p>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Can't find the QR code? Please ask our staff for assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
