"use client";

import type { ReactNode } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

type StandardModalProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClassName?: string;
  onClose: () => void;
};

export default function StandardModal({
  isOpen,
  title,
  description,
  children,
  footer,
  maxWidthClassName = "max-w-4xl",
  onClose,
}: StandardModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex min-h-[100dvh] items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div
        className={`flex max-h-[calc(100dvh-2rem)] w-full ${maxWidthClassName} flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl`}
      >
        <div className="flex shrink-0 items-start justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-gray-500">{description}</p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label={`Close ${title}`}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer ? (
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
