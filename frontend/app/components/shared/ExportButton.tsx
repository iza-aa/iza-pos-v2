"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownTrayIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

export type ExportButtonItem = {
  id: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

export default function ExportButton({
  label = "Export",
  items,
  disabled = false,
}: {
  label?: string;
  items: ExportButtonItem[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={disabled || items.length === 0}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
      >
        <ArrowDownTrayIcon className="h-4 w-4" />
        <span>{label}</span>
        <ChevronDownIcon className="h-4 w-4" />
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              disabled={item.disabled}
              className="flex w-full items-center gap-2 border-b border-gray-100 px-4 py-3 text-left text-sm font-semibold text-gray-700 transition last:border-b-0 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
