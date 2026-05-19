"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
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

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

function normalizeToken(value: string | string[] | undefined): string | null {
  const token = Array.isArray(value) ? value[0] : value;

  if (!token) {
    return null;
  }

  const normalized = decodeURIComponent(token).trim();

  if (!UUID_REGEX.test(normalized)) {
    return null;
  }

  return normalized;
}

function getTokenFromPathname(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1];

  return normalizeToken(lastSegment);
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
  const params = useParams<Record<string, string | string[] | undefined>>();
  const pathname = usePathname();
  const router = useRouter();

  const [error, setError] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("Preparing your table session...");

  const tableId = useMemo(() => {
    const paramToken = normalizeToken(params.token);

    if (paramToken) {
      return paramToken;
    }

    const firstParamValue = Object.values(params)[0];
    const dynamicParamToken = normalizeToken(firstParamValue);

    if (dynamicParamToken) {
      return dynamicParamToken;
    }

    return getTokenFromPathname(pathname);
  }, [params, pathname]);

  useEffect(() => {
    if (!tableId) {
      setError("Invalid table QR code.");
      return;
    }

    let isMounted = true;

    const startSession = async () => {
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
          throw new Error(
            result.success === false
              ? result.error
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
  }, [router, tableId]);

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