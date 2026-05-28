/**
 * Toast Notification Component
 * 
 * Displays toast notifications with different types (success, error, warning, info)
 * Automatically dismisses after duration or manually via close button
 */

"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { OWNER_SEMANTIC_TONES } from "@/lib/constants/theme";
import { subscribeToToasts, type ToastOptions } from "@/lib/services/errorHandling";

interface Toast extends ToastOptions {
  id: number
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextIdRef = useRef(0);

  useEffect(() => {
    const unsubscribe = subscribeToToasts((options) => {
      const toast: Toast = {
        ...options,
        id: nextIdRef.current,
      };

      nextIdRef.current += 1;
      setToasts((prev) => [...prev, toast].slice(-4));

      if (options.duration !== undefined && options.duration > 0) {
        setTimeout(() => {
          dismissToast(toast.id);
        }, options.duration);
      }
    });

    return unsubscribe;
  }, []);

  const dismissToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const getIcon = (type: ToastOptions['type']) => {
    const iconClass = "h-5 w-5 shrink-0";

    switch (type) {
      case "success":
        return <CheckCircleIcon className={`${iconClass} text-[#2F7D50]`} />;
      case "error":
        return <XCircleIcon className={`${iconClass} text-[#BE123C]`} />;
      case "warning":
        return <ExclamationTriangleIcon className={`${iconClass} text-[#B45309]`} />;
      case "info":
        return <InformationCircleIcon className={`${iconClass} text-[#2563EB]`} />;
    }
  };

  const getColorClasses = (type: ToastOptions['type']) => {
    switch (type) {
      case "success":
        return OWNER_SEMANTIC_TONES.success.badgeClass;
      case "error":
        return OWNER_SEMANTIC_TONES.danger.badgeClass;
      case "warning":
        return OWNER_SEMANTIC_TONES.warning.badgeClass;
      case "info":
        return OWNER_SEMANTIC_TONES.info.badgeClass;
    }
  };

  const getPositionClasses = (position: ToastOptions['position']) => {
    switch (position) {
      case "top-right":
        return "right-4 top-4";
      case "top-center":
        return "left-1/2 top-4 -translate-x-1/2";
      case "top-left":
        return "left-4 top-4";
      case "bottom-right":
        return "bottom-4 right-4";
      case "bottom-center":
        return "bottom-4 left-1/2 -translate-x-1/2";
      case "bottom-left":
        return "bottom-4 left-4";
      default:
        return "right-4 top-4";
    }
  };

  return (
    <div className="fixed z-[100] pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            fixed ${getPositionClasses(toast.position)} 
            animate-slide-in pointer-events-auto
          `}
        >
          <div
            className={`
              ${getColorClasses(toast.type)}
              mb-3 flex w-[calc(100vw-2rem)] max-w-sm items-start gap-3
              rounded-lg border p-4 shadow-lg
              transition-all duration-300
            `}
          >
            {getIcon(toast.type)}

            <p className="flex-1 whitespace-pre-line text-sm font-semibold leading-5">
              {toast.message}
            </p>

            {toast.dismissible && (
              <button
                onClick={() => dismissToast(toast.id)}
                className="text-current opacity-60 transition hover:opacity-100"
                aria-label="Close"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      ))}
      
      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
