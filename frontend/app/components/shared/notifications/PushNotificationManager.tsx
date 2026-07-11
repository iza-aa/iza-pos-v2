"use client";

import { useState, useEffect } from "react";
import { BellIcon, BellSlashIcon } from "@heroicons/react/24/outline";
import { showError, showSuccess } from "@/lib/services/errorHandling";

import { usePushSubscription } from "./usePushSubscription";

export default function PushNotificationManager({ role = "staff" }: { role?: string }) {
  const { isSubscribed, isSupported, isLoading, subscribe } = usePushSubscription(role);

  if (!isSupported) {
    return null; // Don't render anything if not supported
  }

  return (
    <button
      onClick={subscribe}
      disabled={isSubscribed || isLoading}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        isSubscribed
          ? "bg-green-100 text-green-700 cursor-default"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
      title={isSubscribed ? "Notifications Enabled" : "Enable Push Notifications"}
    >
      {isSubscribed ? (
        <BellIcon className="h-5 w-5 text-green-600" />
      ) : (
        <BellSlashIcon className="h-5 w-5 text-gray-500" />
      )}
      <span className="hidden sm:inline">
        {isSubscribed ? "Notifications On" : "Enable Notifications"}
      </span>
    </button>
  );
}
