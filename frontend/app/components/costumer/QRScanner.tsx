/**
 * QR Scanner Component
 * Camera-based QR code scanner using html5-qrcode
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { CameraIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface QRScannerProps {
  onScan: (data: string) => void;
  onError: (error: string) => void;
}

export default function QRScanner({ onScan, onError }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch((err) => console.error('Error stopping scanner:', err));
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Success callback
          onScan(decodedText);
          stopScanning();
        },
        (errorMessage) => {
          // Error callback (scanning failed)
          // Don't show error for every frame, just log it
          console.debug('QR scan error:', errorMessage);
        }
      );

      setIsScanning(true);
      setHasPermission(true);
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      setHasPermission(false);
      
      if (err.toString().includes('NotAllowedError')) {
        onError('Camera permission denied. Please allow camera access.');
      } else if (err.toString().includes('NotFoundError')) {
        onError('No camera found on this device.');
      } else {
        onError('Failed to start camera. Please try again.');
      }
    }
  };

  const stopScanning = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        setIsScanning(false);
      }
    } catch (err) {
      console.error('Error stopping scanner:', err);
    }
  };

  return (
    <div className="relative">
      {/* Scanner Container */}
      <div
        id="qr-reader"
        className={`${isScanning ? 'block' : 'hidden'} w-full`}
        style={{ minHeight: '300px' }}
      />

      {/* Initial State */}
      {!isScanning && hasPermission === null && (
        <div className="flex flex-col items-center justify-center p-8 min-h-[300px]">
          <CameraIcon className="h-16 w-16 text-gray-400 mb-4" />
          <button
            onClick={startScanning}
            className="px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Start Camera
          </button>
          <p className="text-xs text-gray-500 mt-4 text-center">
            We need camera access to scan QR codes
          </p>
        </div>
      )}

      {/* Permission Denied */}
      {hasPermission === false && (
        <div className="flex flex-col items-center justify-center p-8 min-h-[300px]">
          <XCircleIcon className="h-16 w-16 text-red-500 mb-4" />
          <p className="text-sm text-gray-700 text-center mb-4">
            Camera access is required to scan QR codes
          </p>
          <button
            onClick={startScanning}
            className="px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Try Again
          </button>
          <p className="text-xs text-gray-500 mt-4 text-center max-w-xs">
            Please enable camera permission in your browser settings and try again
          </p>
        </div>
      )}

      {/* Stop Button (when scanning) */}
      {isScanning && (
        <div className="p-4 text-center">
          <button
            onClick={stopScanning}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Stop Camera
          </button>
        </div>
      )}
    </div>
  );
}
