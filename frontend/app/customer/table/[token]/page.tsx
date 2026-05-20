"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import LoadingScreen from "@/app/components/customer/LoadingScreen";

interface TableSessionData {
  session_id: string;
  table_id: string;
  table_number: string;
  floor_id: string | null;
  floor_name: string | null;
  capacity: number;
  status: string | null;
  started_at: string;
}

type StartTableSessionResponse =
  | {
      success: true;
      data: TableSessionData;
    }
  | {
      success: false;
      error: string;
      details?: Record<string, unknown>;
    };

interface StoredTableSession {
  session_id: string;
  table_id: string;
  table_number: string;
  floor_id: string | null;
  floor_name: string | null;
  capacity: number;
  status: string | null;
  started_at: string;
}

function getTableIdFromCurrentUrl(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const pathname = window.location.pathname;
  const segments = pathname.split("/").filter(Boolean);
  const tableIndex = segments.findIndex((segment) => segment.toLowerCase() === "table");

  if (tableIndex >= 0 && segments[tableIndex + 1]) {
    return decodeURIComponent(segments[tableIndex + 1]).trim();
  }

  const lastSegment = segments[segments.length - 1];

  if (!lastSegment) {
    return null;
  }

  return decodeURIComponent(lastSegment).trim();
}

function getDebugPathInfo(): string {
  if (typeof window === "undefined") {
    return "window is not available";
  }

  const pathname = window.location.pathname;
  const segments = pathname.split("/").filter(Boolean);

  return `pathname=${pathname} | segments=${JSON.stringify(segments)}`;
}

function parseStoredTableSession(value: string | null): StoredTableSession | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<StoredTableSession>;

    if (
      typeof parsed.session_id !== "string" ||
      typeof parsed.table_id !== "string" ||
      typeof parsed.table_number !== "string" ||
      typeof parsed.started_at !== "string"
    ) {
      return null;
    }

    return {
      session_id: parsed.session_id,
      table_id: parsed.table_id,
      table_number: parsed.table_number,
      floor_id: parsed.floor_id ?? null,
      floor_name: parsed.floor_name ?? null,
      capacity: typeof parsed.capacity === "number" ? parsed.capacity : 0,
      status: parsed.status ?? null,
      started_at: parsed.started_at,
    };
  } catch {
    localStorage.removeItem("customer_table_session");
    return null;
  }
}

function saveTableSession(data: TableSessionData) {
  const sessionPayload: StoredTableSession = {
    session_id: data.session_id,
    table_id: data.table_id,
    table_number: data.table_number,
    floor_id: data.floor_id,
    floor_name: data.floor_name,
    capacity: data.capacity,
    status: data.status,
    started_at: data.started_at,
  };

  localStorage.setItem("customer_table_session", JSON.stringify(sessionPayload));

  localStorage.setItem(
    "customer_table",
    JSON.stringify({
      id: data.table_id,
      table_id: data.table_id,
      table_number: data.table_number,
      floor_id: data.floor_id,
      floor_name: data.floor_name,
      capacity: data.capacity,
      status: data.status,
      is_active: true,
    }),
  );

  localStorage.setItem("table_session_start", data.started_at);
}

export default function CustomerTableSessionPage() {
  const router = useRouter();

  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("Preparing your table session...");

  useEffect(() => {
    let isMounted = true;

    const startSession = async () => {
      const tableId = getTableIdFromCurrentUrl();
      const currentDebugInfo = getDebugPathInfo();

      if (!isMounted) {
        return;
      }

      setDebugInfo(currentDebugInfo);

      if (!tableId) {
        setError("Invalid table QR code.");
        return;
      }

      try {
        setLoadingMessage("Validating table QR code...");

        const previousSession = parseStoredTableSession(
          localStorage.getItem("customer_table_session"),
        );

        setLoadingMessage("Starting table session...");

        const response = await fetch("/api/customer/table-session/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            table_id: tableId,
            previous_session_id: previousSession?.session_id ?? null,
          }),
        });

        const result = (await response.json()) as StartTableSessionResponse;

        if (!response.ok || !result.success) {
          const detailText =
            result.success === false && result.details
              ? ` ${JSON.stringify(result.details)}`
              : "";

          throw new Error(
            result.success === false
              ? `${result.error}${detailText}`
              : "Failed to start table session.",
          );
        }

        if (!isMounted) {
          return;
        }

        saveTableSession(result.data);

        setLoadingMessage("Opening menu...");

        router.replace("/customer/menu");
      } catch (sessionError) {
        if (!isMounted) {
          return;
        }

        console.error("Customer table session error:", sessionError);

        setError(
          sessionError instanceof Error
            ? sessionError.message
            : "Failed to start table session.",
        );
      }
    };

    void startSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
        <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <ExclamationTriangleIcon className="h-7 w-7" />
          </div>

          <h1 className="mt-5 text-xl font-bold text-gray-900">
            Table QR Not Available
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-500">{error}</p>

          {debugInfo ? (
            <div className="mt-4 rounded-2xl bg-gray-50 p-3 text-left">
              <p className="wrap-break-words text-xs leading-5 text-gray-500">
                {debugInfo}
              </p>
            </div>
          ) : null}

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => router.replace("/customer/menu")}
              className="w-full rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Continue as Take Away
            </button>

            <button
              type="button"
              onClick={() => router.replace("/customer")}
              className="flex w-full items-center justify-center rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to Customer Home
            </button>
          </div>

          <p className="mt-5 text-xs leading-5 text-gray-400">
            If you are dining in, please scan the QR code placed on your table.
          </p>
        </div>
      </div>
    );
  }

  return (
    <LoadingScreen
      title="Connecting to Table"
      subtitle={loadingMessage} 
      hideBottomNav
    />
  );
}