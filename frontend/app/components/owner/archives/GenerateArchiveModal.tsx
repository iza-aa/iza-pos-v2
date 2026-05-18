"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArchiveBoxIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { COLORS } from "@/lib/constants";

export type ArchiveDataType = "activity_logs" | "sales" | "staff_attendance";

export interface GenerateArchivePayload {
  startDate: string;
  endDate: string;
  dataTypes: ArchiveDataType[];
}

interface GenerateArchiveModalProps {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onGenerate: (payload: GenerateArchivePayload) => Promise<void> | void;
}

interface DataTypeOption {
  id: ArchiveDataType;
  title: string;
  description: string;
  IconComponent: typeof ClipboardDocumentListIcon;
}

const DATA_TYPE_OPTIONS: DataTypeOption[] = [
  {
    id: "activity_logs",
    title: "Activity Logs",
    description: "User actions, audit trail, and system activity.",
    IconComponent: ClipboardDocumentListIcon,
  },
  {
    id: "sales",
    title: "Sales",
    description: "Orders, revenue, and sales summary.",
    IconComponent: CurrencyDollarIcon,
  },
  {
    id: "staff_attendance",
    title: "Staff Attendance",
    description: "Clock-in, clock-out, and attendance records.",
    IconComponent: UserGroupIcon,
  },
];

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCurrentMonthDefaultRange() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    startDate: toDateInputValue(firstDay),
    endDate: toDateInputValue(lastDay),
  };
}

function formatReadableDate(value: string) {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function getDateDiffInDays(startDate: string, endDate: string) {
  if (!startDate || !endDate) return 0;

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  const diff = end.getTime() - start.getTime();

  return Math.floor(diff / 86_400_000) + 1;
}

export default function GenerateArchiveModal({
  open,
  loading = false,
  onClose,
  onGenerate,
}: GenerateArchiveModalProps) {
  const defaultRange = useMemo(() => getCurrentMonthDefaultRange(), []);
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [selectedTypes, setSelectedTypes] = useState<ArchiveDataType[]>([
    "activity_logs",
    "sales",
    "staff_attendance",
  ]);

  useEffect(() => {
    if (!open) return;

    const currentDefaultRange = getCurrentMonthDefaultRange();
    setStartDate(currentDefaultRange.startDate);
    setEndDate(currentDefaultRange.endDate);
    setSelectedTypes(["activity_logs", "sales", "staff_attendance"]);
  }, [open]);

  const selectedDays = getDateDiffInDays(startDate, endDate);
  const isRangeValid = Boolean(startDate && endDate && startDate <= endDate);
  const isTypeValid = selectedTypes.length > 0;
  const canSubmit = isRangeValid && isTypeValid && !loading;

  function toggleDataType(type: ArchiveDataType) {
    setSelectedTypes((current) => {
      if (current.includes(type)) {
        return current.filter((item) => item !== type);
      }

      return [...current, type];
    });
  }

  async function handleSubmit() {
    if (!canSubmit) return;

    await onGenerate({
      startDate,
      endDate,
      dataTypes: selectedTypes,
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 px-4 py-6 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gray-100">
              <ArchiveBoxIcon className="h-6 w-6 text-gray-700" />
            </div>

            <div className="min-w-0">
              <h2 className=" text-xl font-bold text-gray-950">
                Select archive range
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                The default range is the current month through the last day of
                this month.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close modal"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-5">
            <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="mb-4 flex items-center gap-2">
                <CalendarDaysIcon className="h-5 w-5 text-gray-600" />
                <h3 className="text-sm font-bold text-gray-900">Archive Period</h3>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Start Date
                  </span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    disabled={loading}
                    className="h-12 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-gray-400 disabled:cursor-not-allowed disabled:bg-gray-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    End Date
                  </span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    disabled={loading}
                    className="h-12 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-gray-400 disabled:cursor-not-allowed disabled:bg-gray-100"
                  />
                </label>
              </div>

              <div className="mt-4 rounded-lg border border-gray-200 bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Selected Range
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {formatReadableDate(startDate)} - {formatReadableDate(endDate)}
                </p>

                {isRangeValid ? (
                  <p className="mt-1 text-xs text-gray-500">
                    {selectedDays} day{selectedDays === 1 ? "" : "s"} will be
                    included in this archive.
                  </p>
                ) : (
                  <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                    <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>End date must be the same as or later than start date.</span>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Data Types</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Choose which data should be included.
                  </p>
                </div>

                <span className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                  {selectedTypes.length}/3 selected
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {DATA_TYPE_OPTIONS.map((option) => {
                  const selected = selectedTypes.includes(option.id);
                  const IconComponent = option.IconComponent;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleDataType(option.id)}
                      disabled={loading}
                      className={[
                        "flex items-start gap-3 rounded-lg border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
                        selected
                          ? "border-gray-900 bg-gray-50"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50",
                      ].join(" ")}
                    >
                      <div
                        className={[
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                          selected ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500",
                        ].join(" ")}
                      >
                        <IconComponent className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-sm font-bold text-gray-900">
                            {option.title}
                          </h4>

                          {selected ? (
                            <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-gray-900" />
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm leading-5 text-gray-500">
                          {option.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {!isTypeValid ? (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>Select at least one data type.</span>
                </div>
              ) : null}
            </section>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-lg px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: canSubmit ? COLORS.PRIMARY : "#000000" }}
          >
            {loading ? "Generating..." : "Generate Archive"}
          </button>
        </div>
      </div>
    </div>
  );
}