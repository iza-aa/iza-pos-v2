"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  ExclamationTriangleIcon,
  QrCodeIcon,
} from "@heroicons/react/24/outline";

type TableInfo = {
  id: string;
  table_id: string;
  table_number: string;
  floor_id: string | null;
  floor_name: string | null;
  capacity: number;
  status: string | null;
  is_active: boolean;
  qr_code_url: string | null;
  qr_generated_at: string | null;
};

type ValidateTableResponse =
  | {
      success: true;
      data: TableInfo;
    }
  | {
      success: false;
      error: string;
    };

function getRouteToken(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default function CustomerTablePage() {
  const params = useParams();
  const rawToken = getRouteToken(params.token);
  const token = useMemo(() => rawToken.trim(), [rawToken]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (hasRedirected.current) {
      return;
    }

    if (!token) {
      setLoading(false);
      setError("Invalid table QR code. Please scan the QR code again.");
      return;
    }

    const validateAndSetTable = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/customer/validate-table?token=${encodeURIComponent(token)}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const result = (await response.json()) as ValidateTableResponse;

        if (!response.ok || !result.success) {
          setLoading(false);
          setError(
            result.success === false
              ? result.error
              : "Invalid table QR code. Please scan again.",
          );
          return;
        }

        localStorage.setItem("customer_table", JSON.stringify(result.data));
        localStorage.setItem("table_session_start", new Date().toISOString());

        hasRedirected.current = true;
        window.location.replace("/customer/menu");
      } catch (validationError) {
        console.error("Error validating table:", validationError);
        setLoading(false);
        setError("Failed to validate table. Please try again.");
      }
    };

    void validateAndSetTable();
  }, [token]);

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

          <p className="text-lg font-medium text-white">Validating table...</p>
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