"use client";

import { useEffect, useState } from "react";
import { ExclamationTriangleIcon, InformationCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { registerConfirmDialog } from "@/lib/services/confirmService";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
};

export default function GlobalConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolvePromise, setResolvePromise] = useState<((val: boolean) => void) | null>(null);

  useEffect(() => {
    registerConfirmDialog((opts) => {
      setOptions(opts);
      setIsOpen(true);
      return new Promise<boolean>((resolve) => {
        setResolvePromise(() => resolve);
      });
    });
  }, []);

  if (!isOpen || !options) return null;

  const handleClose = () => {
    setIsOpen(false);
    if (resolvePromise) resolvePromise(false);
  };

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolvePromise) resolvePromise(true);
  };

  const isDanger = options.type === "danger";
  const isWarning = options.type === "warning";
  
  const Icon = isDanger || isWarning ? ExclamationTriangleIcon : InformationCircleIcon;
  const iconColor = isDanger ? "text-danger-red" : isWarning ? "text-yellow-600" : "text-blue-600";
  const iconBg = isDanger ? "bg-red-50" : isWarning ? "bg-yellow-50" : "bg-blue-50";
  const confirmBtnClass = isDanger
    ? "bg-danger-red hover:bg-red-700 focus:ring-red-500 text-white"
    : isWarning
    ? "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500 text-white"
    : "bg-primary hover:bg-gray-800 focus:ring-gray-800 text-white";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
              <Icon className={`h-6 w-6 ${iconColor}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mt-0.5">
                {options.title || "Confirmation"}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close dialog"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-6">
          <p className="text-sm leading-6 text-gray-700 whitespace-pre-wrap">
            {options.message}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-5 py-4">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
          >
            {options.cancelText || "Cancel"}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${confirmBtnClass}`}
          >
            {options.confirmText || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
