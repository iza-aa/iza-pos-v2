'use client'

import { useState, useRef, useEffect } from "react";

interface Props {
  value: string;
  onChange: (val: string) => void;
  options?: string[];
}

const defaultOptions = ["Aktif", "Nonaktif", "Cuti"];

export default function CostumDropdown({ value, onChange, options }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const opts = options || defaultOptions;

  // Cek apakah ini dropdown status (pakai defaultOptions)
  const isStatus = !options;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function getStatusClass(status: string) {
    if (status === "Aktif") return "bg-green-100 text-green-700";
    if (status === "Cuti") return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  }

  return (
    <div ref={ref} className="relative w-20">
      <button
        type="button"
        className={`w-full px-3 py-1 rounded text-xs font-semibold shadow hover:bg-gray-50 transition ${
          isStatus ? getStatusClass(value) : ""
        }`}
        onClick={() => setOpen((v) => !v)}
      >
        {value}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-full bg-white rounded shadow z-10">
          {opts.map((opt) => (
            <div
              key={opt}
              className={`px-3 py-2 text-xs cursor-pointer hover:bg-blue-50 rounded ${
                isStatus && opt === value ? getStatusClass(opt) + " font-bold" : opt === value ? "font-bold" : ""
              }`}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}