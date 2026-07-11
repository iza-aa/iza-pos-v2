"use client";

import { useState, useEffect } from "react";
import { XMarkIcon, BellAlertIcon } from "@heroicons/react/24/outline";
import { usePushSubscription } from "./usePushSubscription";

export default function GlobalNotificationPrompt({ role = "staff" }: { role?: string }) {
  const { isSubscribed, isSupported, isLoading, hasChecked, subscribe } = usePushSubscription(role);
  const [isVisible, setIsVisible] = useState(false);
  const [isIosStandalone, setIsIosStandalone] = useState(true); // Assume true initially to prevent flicker

  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined" || !hasChecked) return;

    // Check if dismissed recently (24 hours)
    const dismissedAt = localStorage.getItem("notification_prompt_dismissed_at");
    if (dismissedAt) {
      const dismissedTime = new Date(dismissedAt).getTime();
      const now = new Date().getTime();
      if (now - dismissedTime < 24 * 60 * 60 * 1000) {
        return; // Still dismissed
      }
    }

    // Detect iOS and standalone mode
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const standalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
    
    if (isIosDevice) {
      setIsIosStandalone(!!standalone);
    }

    // Show if:
    // 1. Not subscribed AND supported (Android, Desktop, iOS standalone)
    // 2. OR iOS device but not standalone (needs instruction to add to home screen)
    if (!isSubscribed) {
      if (isSupported || (isIosDevice && !standalone)) {
        setIsVisible(true);
      }
    }
  }, [hasChecked, isSubscribed, isSupported]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("notification_prompt_dismissed_at", new Date().toISOString());
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] sm:left-auto sm:right-4 sm:w-96">
      <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-xl shadow-blue-900/5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <BellAlertIcon className="h-6 w-6" />
          </div>
          
          <div className="flex-1 pt-0.5">
            <h3 className="text-sm font-semibold text-gray-900">
              Notifikasi Pesanan
            </h3>
            
            <p className="mt-1 text-sm text-gray-500 leading-relaxed">
              {!isIosStandalone && !isSupported ? (
                <>Untuk menerima notifikasi secara real-time, silakan tap <strong>Share</strong> di bawah, lalu pilih <strong>Add to Home Screen</strong>.</>
              ) : (
                <>Aktifkan notifikasi untuk menerima pemberitahuan pesanan baru secara real-time.</>
              )}
            </p>

            <div className="mt-4 flex gap-3">
              {(!isIosStandalone && !isSupported) ? (
                // Only show dismiss for iOS browser instruction
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
                >
                  Mengerti
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      subscribe();
                      setIsVisible(false); // Hide immediately on subscribe attempt
                    }}
                    disabled={isLoading}
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-70"
                  >
                    {isLoading ? "Memproses..." : "Aktifkan Sekarang"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
                  >
                    Nanti
                  </button>
                </>
              )}
            </div>
          </div>
          
          <button
            type="button"
            onClick={handleDismiss}
            className="-m-1 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
          >
            <span className="sr-only">Tutup</span>
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
