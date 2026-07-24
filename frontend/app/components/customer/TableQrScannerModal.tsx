"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CameraIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  getStoredCustomerTableSession,
  saveCustomerTableSession,
  type CustomerTableSession,
} from "@/lib/customer/customerSession";
import { extractTableQrValue } from "@/lib/customer/tableQr.js";

type ScannerInstance = {
  start: (
    cameraConfig: { facingMode: "environment" | "user" },
    config: {
      fps?: number;
      qrbox?: { width: number; height: number };
      aspectRatio?: number;
      disableFlip?: boolean;
    },
    onScanSuccess: (decodedText: string) => void,
  ) => Promise<void | null>;
  stop: () => Promise<void>;
  clear: () => void;
};

type ScannerConstructor = new (elementId: string) => ScannerInstance;

type StartTableSessionResponse =
  | { success: true; data: CustomerTableSession }
  | { success: false; error: string };

const QR_READER_ID = "customer-table-qr-reader";

export default function TableQrScannerModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const scannerRef = useRef<ScannerInstance | null>(null);
  const decodedRef = useRef(false);
  const submittingRef = useRef(false);
  const [message, setMessage] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;

    if (!scanner) return;

    try {
      await scanner.stop();
    } catch {
      // The scanner may not have completed startup before the modal closed.
    }

    try {
      scanner.clear();
    } catch {
      // Clearing an already-removed scanner is safe to ignore.
    }
  }, []);

  const startTableSession = useCallback(async (tableQrValue: string) => {
    if (submittingRef.current) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    setMessage("Connecting to your table...");

    try {
      const previousSession = getStoredCustomerTableSession();
      const response = await fetch("/api/customer/table-session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_token: tableQrValue,
          previous_session_id: previousSession?.session_id ?? null,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as StartTableSessionResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.success === false
            ? result.error
            : "Unable to start a table session.",
        );
      }

      saveCustomerTableSession(result.data);
      window.location.assign("/customer");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to start a table session.",
      );
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, []);

  const handleDecodedValue = useCallback(async (decodedText: string) => {
    if (decodedRef.current) return;

    const tableQrValue = extractTableQrValue(decodedText);

    if (!tableQrValue) {
      setMessage("This is not a valid table QR code. Please scan the QR on your table.");
      return;
    }

    decodedRef.current = true;
    await stopScanner();
    await startTableSession(tableQrValue);
  }, [startTableSession, stopScanner]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    decodedRef.current = false;
    submittingRef.current = false;
    setMessage("");
    setIsStarting(true);

    const startScanner = async () => {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 100));

      try {
        const html5QrcodeModule = await import("html5-qrcode");

        if (cancelled) return;

        const Html5Qrcode = html5QrcodeModule.Html5Qrcode as unknown as ScannerConstructor;
        const scanner = new Html5Qrcode(QR_READER_ID);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 240, height: 240 },
            aspectRatio: 1,
            disableFlip: true,
          },
          (decodedText) => {
            void handleDecodedValue(decodedText);
          },
        );

        if (!cancelled) {
          setMessage("Point your camera at the QR code on your table.");
        }
      } catch {
        if (!cancelled) {
          setMessage("Camera could not be opened. Allow camera access or paste the table QR URL below.");
        }
      } finally {
        if (!cancelled) {
          setIsStarting(false);
        }
      }
    };

    void startScanner();

    return () => {
      cancelled = true;
      void stopScanner();
    };
  }, [handleDecodedValue, isOpen, stopScanner]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-black/50 p-4 sm:items-center sm:justify-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Scan Table QR</h2>
            <p className="mt-1 text-sm text-gray-500">
              Scan the QR code placed on your table to start dine-in ordering.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
            aria-label="Close table QR scanner"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl bg-gray-950 p-3">
          <div id={QR_READER_ID} className="min-h-[260px] overflow-hidden rounded-xl" />
          {isStarting ? (
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-white/75">
              <CameraIcon className="h-4 w-4 animate-pulse" />
              Opening camera...
            </div>
          ) : null}
        </div>

        {message ? (
          <p className="mt-3 text-center text-sm leading-5 text-gray-600">{message}</p>
        ) : null}
      </div>
    </div>
  );
}
