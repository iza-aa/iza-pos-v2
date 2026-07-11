"use client";

import { useState, useEffect } from "react";
import { showError, showSuccess } from "@/lib/services/errorHandling";

export function usePushSubscription(role: string = "staff") {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      checkSubscription();
    } else {
      setHasChecked(true);
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
    } finally {
      setHasChecked(true);
    }
  };

  const subscribe = async () => {
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

  return {
    isSubscribed,
    isSupported,
    isLoading,
    hasChecked,
    subscribe,
  };
}
