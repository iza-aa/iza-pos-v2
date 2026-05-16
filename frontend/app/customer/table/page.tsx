/**
 * Customer Table Entry Page
 * Only accepts QR code URL parameter from physical QR scan
 * No manual scanner - customers must scan physical QR at their table
 */

"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ExclamationTriangleIcon,
  QrCodeIcon,
} from "@heroicons/react/24/outline";

function CustomerTableContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasExistingSession, setHasExistingSession] = useState(false);
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (hasRedirected.current) return;

    const existingTable = localStorage.getItem("customer_table");

    if (existingTable) {
      try {
        const tableData = JSON.parse(existingTable);

        if (tableData && tableData.id) {
          hasRedirected.current = true;
          setHasExistingSession(true);
          setLoading(true);
          window.location.replace("/customer/menu");
          return;
        }

        localStorage.removeItem("customer_table");
        localStorage.removeItem("customer_cart");
        localStorage.removeItem("customer_name");
      } catch (parseError) {
        console.error("Failed to parse table session:", parseError);
        localStorage.removeItem("customer_table");
        localStorage.removeItem("customer_cart");
        localStorage.removeItem("customer_name");
      }
    }

    const table = searchParams.get("table");

    if (table && !hasRedirected.current) {
      void validateAndSetTable(table);
    }
  }, [searchParams]);

  const validateAndSetTable = async (tableNum: string) => {
    if (hasRedirected.current) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/customer/validate-table?table_number=${encodeURIComponent(
          tableNum,
        )}`,
      );

      const result = await response.json();

      if (result.success && result.data) {
        localStorage.setItem("customer_table", JSON.stringify(result.data));
        localStorage.setItem("table_session_start", new Date().toISOString());

        hasRedirected.current = true;
        window.location.replace("/customer/menu");
        return;
      }

      setLoading(false);
      setError(result.error || "Invalid table number");
    } catch (validationError) {
      console.error("Error validating table:", validationError);
      setLoading(false);
      setError("Failed to validate table. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-b from-gray-900 to-gray-800 p-4">
        <div className="text-center">
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2">
              <div
                className="h-3 w-3 animate-bounce rounded-full bg-white"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="h-3 w-3 animate-bounce rounded-full bg-white"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="h-3 w-3 animate-bounce rounded-full bg-white"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>

          <p className="text-lg font-medium text-white">
            {hasExistingSession
              ? "Checking your session..."
              : "Validating table..."}
          </p>
          <p className="mt-2 text-sm text-gray-400">Please wait a moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-b from-gray-900 to-gray-800 p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
            <QrCodeIcon className="h-10 w-10 text-gray-700" />
          </div>

          <h1 className="mb-3 text-2xl font-bold text-gray-900">
            Scan QR Code
          </h1>

          <p className="mb-6 text-gray-600">
            Please scan the QR code on your table to access our menu and place
            your order.
          </p>

          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <QrCodeIcon className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              <div className="text-left">
                <p className="mb-1 text-sm font-medium text-blue-900">
                  Secure Access
                </p>
                <p className="text-xs text-blue-700">
                  Each table has a unique QR code. Scan it to ensure your order
                  is delivered to the correct table.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <p className="text-left text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <div className="mt-8 border-t border-gray-200 pt-6">
            <p className="text-xs text-gray-500">
              Cannot find the QR code? Please ask our staff for assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomerTableFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-b from-gray-900 to-gray-800 p-4">
      <div className="text-center">
        <div className="mb-6">
          <div className="flex items-center justify-center gap-2">
            <div
              className="h-3 w-3 animate-bounce rounded-full bg-white"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="h-3 w-3 animate-bounce rounded-full bg-white"
              style={{ animationDelay: "150ms" }}
            />
            <div
              className="h-3 w-3 animate-bounce rounded-full bg-white"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        </div>

        <p className="text-lg font-medium text-white">Loading...</p>
        <p className="mt-2 text-sm text-gray-400">Please wait a moment</p>
      </div>
    </div>
  );
}

export default function CustomerTablePage() {
  return (
    <Suspense fallback={<CustomerTableFallback />}>
      <CustomerTableContent />
    </Suspense>
  );
}