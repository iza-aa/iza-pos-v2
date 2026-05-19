"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  ClockIcon,
  GiftIcon,
  LockClosedIcon,
  MapPinIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import {
  CheckCircleIcon,
} from "@heroicons/react/24/solid";
import {
  type CustomerAccountSession,
  formatMemberSince,
  getStoredCustomerAccount,
} from "@/lib/customer/customerAccount";
import {
  type CustomerTableSession,
  validateStoredCustomerTableSession,
} from "@/lib/customer/customerSession";

export default function CustomerPage() {
  const router = useRouter();
  const [tableSession, setTableSession] = useState<CustomerTableSession | null>(null);
  const [customerAccount, setCustomerAccount] =
    useState<CustomerAccountSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      const validSession = await validateStoredCustomerTableSession();

      if (isMounted) {
        setTableSession(validSession);
        setCustomerAccount(getStoredCustomerAccount());
        setIsReady(true);
      }
    };

    void loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const sessionLabel = useMemo(() => {
    if (!tableSession) {
      return "Take away ordering";
    }

    if (tableSession.floor_name) {
      return `${tableSession.table_number} • ${tableSession.floor_name}`;
    }

    return tableSession.table_number;
  }, [tableSession]);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-6">
        <div className="mx-auto max-w-lg">
          <div className="h-40 animate-pulse rounded-3xl bg-gray-200" />
          <div className="mt-4 h-24 animate-pulse rounded-2xl bg-gray-200" />
          <div className="mt-3 h-24 animate-pulse rounded-2xl bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gray-900 px-4 py-8 text-white">
        <div className="mx-auto max-w-lg">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="mt-2 text-2xl font-bold">
                Welcome {customerAccount ? customerAccount.name : tableSession ? tableSession.table_number : "Guest"}
              </h1>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-gray-900">
                {tableSession ? (
                  <MapPinIcon className="h-5 w-5" />
                ) : (
                  <ShoppingBagIcon className="h-5 w-5" />
                )}
              </div>

              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {tableSession ? "Dine-in Session" : "Public Menu"}
                </p>
                <p className="mt-1 text-sm text-gray-300">{sessionLabel}</p>
                <p className="mt-3 text-xs leading-5 text-gray-400">
                  {tableSession
                    ? "Your table session is active. You can browse the menu, place another order, or track your current order."
                    : "You are browsing without a table. Checkout will continue as a take away order."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-lg space-y-4 px-4 py-5">
        <button
          type="button"
          onClick={() => router.push("/customer/menu")}
          className="group w-full rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-gray-300 hover:shadow-md"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gray-900 text-white">
              <ShoppingBagIcon className="h-6 w-6" />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-gray-900">Browse Menu</h2>
              <p className="mt-1 text-sm text-gray-500">
                View products and add items to cart.
              </p>
            </div>

            <ArrowRightIcon className="h-5 w-5 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-gray-900" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => router.push("/customer/track")}
          className="group w-full rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-gray-300 hover:shadow-md"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-gray-900">
              <ClockIcon className="h-6 w-6" />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-gray-900">Track Order</h2>
              <p className="mt-1 text-sm text-gray-500">
                Check the latest status of your order.
              </p>
            </div>

            <ArrowRightIcon className="h-5 w-5 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-gray-900" />
          </div>
        </button>

        {customerAccount ? (
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <GiftIcon className="h-5 w-5 text-gray-900" />
              <h2 className="text-sm font-bold text-gray-900">Member Rewards</h2>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-2xl font-bold text-gray-900">
                {customerAccount.loyalty_points} pts
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Member since {formatMemberSince(customerAccount.member_since)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/customer/rewards")}
              className="mt-3 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:border-gray-400 hover:text-gray-950"
            >
              View Rewards
            </button>
          </section>
        ) : (
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                <LockClosedIcon className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Member Rewards</h2>
                <p className="text-xs font-medium text-gray-400">Locked feature</p>
              </div>
            </div>

            <p className="text-sm leading-6 text-gray-500">
              Login or create an account to collect points, save your orders, and unlock member discounts.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => router.push("/customer/login")}
                className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:border-gray-400 hover:text-gray-950"
              >
                Login
              </button>

              <button
                type="button"
                onClick={() => router.push("/customer/register")}
                className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Register
              </button>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-gray-900">Ordering Info</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-sm font-bold text-gray-900">Fast</p>
              <p className="mt-1 text-xs text-gray-500">Simple customer order flow.</p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-sm font-bold text-gray-900">Clear</p>
              <p className="mt-1 text-xs text-gray-500">Track order status in real time.</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900">Need assistance?</h2>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            Please ask our staff if you need help with ordering, payment, or table service.
          </p>
        </section>
      </main>
    </div>
  );
}