"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightOnRectangleIcon,
  ClipboardDocumentIcon,
  InformationCircleIcon,
  QrCodeIcon,
} from "@heroicons/react/24/outline";
import {
  type CustomerTableSession,
  clearCustomerTableSession,
  endCustomerTableSession,
  validateStoredCustomerTableSession,
} from "@/lib/customer/customerSession";

export default function CustomerSettings() {
  const router = useRouter();

  const [tableSession, setTableSession] = useState<CustomerTableSession | null>(null);
  const [pickupCode, setPickupCode] = useState<string | null>(null);
  const [endingSession, setEndingSession] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      const validSession = await validateStoredCustomerTableSession();

      if (isMounted) {
        setTableSession(validSession);
        setPickupCode(localStorage.getItem("current_pickup_code"));
      }
    };

    void loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleClearTableSession = async () => {
    if (!tableSession) {
      clearCustomerTableSession();
      router.push("/customer/menu");
      return;
    }

    setEndingSession(true);

    const success = await endCustomerTableSession(tableSession.session_id);

    if (!success) {
      clearCustomerTableSession();
    }

    setEndingSession(false);
    setTableSession(null);
    router.push("/customer/menu");
  };

  const handleClearOrderSession = () => {
    localStorage.removeItem("current_order_id");
    localStorage.removeItem("current_pickup_code");

    setPickupCode(null);
  };

  const handleTrackPickupCode = () => {
    if (!pickupCode) {
      return;
    }

    router.push(`/customer/track?code=${encodeURIComponent(pickupCode)}`);
  };

  const copyPickupTrackingLink = async () => {
    if (!pickupCode) {
      return;
    }

    const link = `${window.location.origin}/customer/track?code=${encodeURIComponent(
      pickupCode,
    )}`;

    try {
      await navigator.clipboard.writeText(link);
      alert("Tracking link copied.");
    } catch {
      alert(link);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-4">
        <div className="mx-auto max-w-lg">
          <h1 className="text-xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your current table and order tracking session.
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-lg space-y-4 px-4 py-4">
        {tableSession ? (
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-600">
                  Current Table
                </h2>
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {tableSession.table_number}
                </p>

                {tableSession.floor_name ? (
                  <p className="mt-1 text-sm text-gray-500">{tableSession.floor_name}</p>
                ) : null}

                {typeof tableSession.capacity === "number" ? (
                  <p className="mt-1 text-xs text-gray-400">
                    Capacity: {tableSession.capacity} people
                  </p>
                ) : null}
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-700">
                <QrCodeIcon className="h-6 w-6" />
              </div>
            </div>

            <button
              type="button"
              onClick={handleClearTableSession}
              disabled={endingSession}
              className="flex w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ArrowRightOnRectangleIcon className="mr-2 h-5 w-5" />
              {endingSession ? "Ending Session..." : "Leave Table Session"}
            </button>

            <p className="mt-3 text-xs leading-5 text-gray-500">
              To order from another table, scan the QR code on that table. Your old table session will be closed automatically.
            </p>
          </section>
        ) : (
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-600">Table Session</h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              No table is currently selected. You can browse the menu as take away, or scan a table QR code for dine-in ordering.
            </p>

            <button
              type="button"
              onClick={() => router.push("/customer/menu")}
              className="mt-4 w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Browse Menu
            </button>
          </section>
        )}

        {pickupCode ? (
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-600">Current Pickup Code</h2>
            <div className="mt-3 rounded-2xl bg-gray-50 p-4">
              <p className="text-2xl font-bold tracking-wide text-gray-900">
                {pickupCode}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Use this code to track or pick up your take away order.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleTrackPickupCode}
                className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Track Order
              </button>

              <button
                type="button"
                onClick={copyPickupTrackingLink}
                className="flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <ClipboardDocumentIcon className="mr-2 h-5 w-5" />
                Copy Link
              </button>
            </div>

            <button
              type="button"
              onClick={handleClearOrderSession}
              className="mt-3 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-500 transition hover:bg-gray-50"
            >
              Clear Tracking Session
            </button>
          </section>
        ) : null}

        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <InformationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

            <div>
              <h3 className="text-sm font-semibold text-blue-900">How it works</h3>
              <div className="mt-2 space-y-1 text-xs leading-5 text-blue-800">
                <p>Scan a table QR code for dine-in ordering.</p>
                <p>Open the menu directly for take away ordering.</p>
                <p>Use your pickup code to track take away orders later.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-600">About</h2>

          <div className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-100">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-gray-700">Version</span>
              <span className="text-sm font-medium text-gray-900">1.0.0</span>
            </div>

            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-gray-700">App Type</span>
              <span className="text-sm font-medium text-gray-900">Self Ordering</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}