"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  GiftIcon,
  LockClosedIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import {
  type CustomerAccountSession,
  formatMemberSince,
  getStoredCustomerAccount,
} from "@/lib/customer/customerAccount";

export default function CustomerRewardsPage() {
  const router = useRouter();
  const [customerAccount, setCustomerAccount] =
    useState<CustomerAccountSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setCustomerAccount(getStoredCustomerAccount());
    setIsReady(true);
  }, []);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-6">
        <div className="mx-auto max-w-lg">
          <div className="h-32 animate-pulse rounded-3xl bg-gray-200" />
          <div className="mt-4 h-24 animate-pulse rounded-2xl bg-gray-200" />
        </div>
      </div>
    );
  }

  if (!customerAccount) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-4">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/customer")}
              className="rounded-lg p-2 text-gray-600 transition hover:text-gray-900"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Rewards</h1>
              <p className="mt-1 text-sm text-gray-500">Member feature</p>
            </div>
          </div>
        </div>

        <main className="mx-auto max-w-lg px-4 py-5">
          <section className="rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-700">
              <LockClosedIcon className="h-7 w-7" />
            </div>

            <h2 className="mt-5 text-xl font-bold text-gray-900">
              Rewards are locked
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Login or create an account to collect points, save order history, and unlock member discounts.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => router.push("/customer/login?redirect=/customer/rewards")}
                className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:border-gray-400 hover:text-gray-950"
              >
                Login
              </button>

              <button
                type="button"
                onClick={() => router.push("/customer/register?redirect=/customer/rewards")}
                className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Register
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-4">
        <div className="mx-auto max-w-lg">
          <h1 className="text-xl font-bold text-gray-900">Rewards</h1>
          <p className="mt-1 text-sm text-gray-500">
            Your member points and benefits.
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-lg space-y-4 px-4 py-5">
        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-500">Current Points</p>
              <p className="mt-2 text-4xl font-bold text-gray-900">
                {customerAccount.loyalty_points}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Member since {formatMemberSince(customerAccount.member_since)}
              </p>
            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900 text-white">
              <GiftIcon className="h-7 w-7" />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-gray-900" />
            <h2 className="text-sm font-bold text-gray-900">Available Discounts</h2>
          </div>

          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center">
            <p className="text-sm font-semibold text-gray-800">
              No discount available yet
            </p>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              Keep ordering as a member to collect points and unlock future rewards.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900">Member Benefits</h2>

          <div className="mt-3 space-y-3">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-sm font-semibold text-gray-900">Collect Points</p>
              <p className="mt-1 text-xs text-gray-500">
                Earn points from paid orders.
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-sm font-semibold text-gray-900">Faster Checkout</p>
              <p className="mt-1 text-xs text-gray-500">
                Your name and contact details can be reused for future orders.
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-sm font-semibold text-gray-900">Member Discounts</p>
              <p className="mt-1 text-xs text-gray-500">
                Discount vouchers can be added later when the reward system is expanded.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}