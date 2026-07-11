"use client";

import { useState, useEffect } from "react";
import { BellIcon, BellSlashIcon } from "@heroicons/react/24/outline";
import { showError, showSuccess } from "@/lib/services/errorHandling";

export default function PushNotificationManager({ role = "staff" }: { role?: string }) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      checkSubscription();
    }
  }, []);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  };

  const subscribeButtonOnClick = async () => {
    if (!isSupported) {
      showError("Push notifications are not supported in this browser.");
      return;
    }

    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;

      // Ask for permission explicitly if not granted
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        showError("Notification permission denied.");
        setIsLoading(false);
        return;
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error("VAPID public key is not configured.");
      }

      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      // Send to backend
      const response = await fetch("/api/web-push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription,
          role,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save subscription on server.");
      }

      setIsSubscribed(true);
      showSuccess("Notifications enabled successfully!");
    } catch (error: any) {
      console.error("Failed to subscribe:", error);
      showError("Failed to enable notifications: " + (error.message || "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return null; // Don't render anything if not supported
  }

  return (
    <button
      onClick={subscribeButtonOnClick}
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
