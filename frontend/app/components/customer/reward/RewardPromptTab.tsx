"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GiftIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const DISMISS_STORAGE_KEY = "reward_prompt_dismissed_until";
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000;

function shouldShowPrompt(): boolean {
  const dismissedUntil = localStorage.getItem(DISMISS_STORAGE_KEY);

  if (!dismissedUntil) {
    return true;
  }

  const timestamp = Number(dismissedUntil);

  if (!Number.isFinite(timestamp)) {
    localStorage.removeItem(DISMISS_STORAGE_KEY);
    return true;
  }

  return Date.now() > timestamp;
}

export default function RewardPromptTab() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setMounted(true);
    setVisible(shouldShowPrompt());
  }, []);

  const dismissPrompt = () => {
    localStorage.setItem(
      DISMISS_STORAGE_KEY,
      String(Date.now() + DISMISS_DURATION_MS),
    );
    setExpanded(false);
    setVisible(false);
  };

  if (!mounted || !visible) {
    return null;
  }

  return (
    <div className="fixed right-0 top-1/2 z-40 -translate-y-1/2">
      {expanded ? (
        <div className="mr-3 w-72 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white">
                <GiftIcon className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-bold text-gray-900">Join IZA Rewards</p>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Login or create an account to collect points from your orders.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={dismissPrompt}
              className="rounded-lg p-1 text-gray-400 transition hover:text-gray-700"
              aria-label="Dismiss reward prompt"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => router.push("/customer/login")}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 transition hover:border-gray-400 hover:text-gray-950"
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => router.push("/customer/register")}
              className="rounded-xl bg-gray-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-gray-800"
            >
              Register
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="group flex h-24 w-12 animate-pulse items-center justify-center rounded-l-full border border-r-0 border-gray-200 bg-white text-gray-900 transition hover:w-14"
          aria-label="Open rewards prompt"
        >
          <div className="-rotate-90 whitespace-nowrap text-[11px] font-bold tracking-wide text-gray-700 group-hover:text-gray-950">
            Gain Rewards
          </div>
        </button>
      )}
    </div>
  );
}